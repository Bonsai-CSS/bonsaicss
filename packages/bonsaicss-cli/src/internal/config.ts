import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

import type { CliConfig, ParsedArgs, ReportOptions, ResolvedOptions } from './types.js';

const DEFAULT_CONFIG_FILENAMES = [
    'bonsai.config.ts',
    'bonsai.config.mts',
    'bonsai.config.cts',
    'bonsai.config.js',
    'bonsai.config.mjs',
    'bonsai.config.cjs',
    'bonsai.config.json',
];

export function resolveMaybeAbsolute(base: string, target: string): string {
    if (path.isAbsolute(target)) return target;
    return path.resolve(base, target);
}

export function findDefaultConfigPath(cwd: string): string | undefined {
    for (const filename of DEFAULT_CONFIG_FILENAMES) {
        const candidate = path.join(cwd, filename);
        if (fs.existsSync(candidate)) return candidate;
    }
    return undefined;
}

function normalizeLoadedConfig(value: unknown): CliConfig {
    const maybeModule =
        value && typeof value === 'object' && 'default' in (value as Record<string, unknown>)
            ? (value as { default: unknown }).default
            : value;

    const config =
        typeof maybeModule === 'function' ? (maybeModule as () => unknown)() : maybeModule;
    if (config && typeof (config as PromiseLike<unknown>).then === 'function') {
        throw new Error('Async config functions are not supported. Return a plain object.');
    }

    if (!config || typeof config !== 'object' || Array.isArray(config)) {
        throw new Error('Config must export an object or a function that returns an object.');
    }

    return config as CliConfig;
}

export function loadConfig(configPath: string, cwd = process.cwd()): CliConfig {
    const absolutePath = resolveMaybeAbsolute(cwd, configPath);
    if (!fs.existsSync(absolutePath)) {
        throw new Error(`Config file not found: ${absolutePath}`);
    }

    const extension = path.extname(absolutePath).toLowerCase();

    try {
        if (extension === '.json') {
            const raw = fs.readFileSync(absolutePath, 'utf8');
            return JSON.parse(raw) as CliConfig;
        }

        if (!['.js', '.cjs', '.mjs', '.ts', '.mts', '.cts'].includes(extension)) {
            throw new Error(
                `Unsupported config extension: ${extension || '(none)'}. Use .json/.js/.cjs/.mjs/.ts/.mts/.cts.`,
            );
        }

        const script = `
const { pathToFileURL } = require('node:url');
const { createRequire } = require('node:module');
const file = process.argv[1];
(async () => {
  let loaded;
  if (file.endsWith('.cjs')) {
    loaded = createRequire(file)(file);
  } else {
    loaded = await import(pathToFileURL(file).href);
  }
  const candidate = loaded && typeof loaded === 'object' && 'default' in loaded ? loaded.default : loaded;
  const config = typeof candidate === 'function' ? candidate() : candidate;
  if (config && typeof config.then === 'function') {
    throw new Error('Async config functions are not supported. Return a plain object.');
  }
  process.stdout.write(JSON.stringify(config));
})().catch((error) => {
  process.stderr.write(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
`;

        const args = [];
        if (['.ts', '.mts', '.cts'].includes(extension)) {
            args.push('--experimental-strip-types');
        }
        args.push('-e', script, absolutePath);

        const output = execFileSync(process.execPath, args, {
            encoding: 'utf8',
            cwd,
        }).trim();

        const loaded: unknown = output.length > 0 ? JSON.parse(output) : {};
        return normalizeLoadedConfig(loaded);
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        throw new Error(`Invalid config file: ${message}`);
    }
}

export function mergeConfigWithArgs(config: CliConfig, args: ParsedArgs): ResolvedOptions {
    const cwd = path.resolve(args.cwd ?? config.cwd ?? process.cwd());
    const content = args.content.length > 0 ? args.content : [...(config.content ?? [])];
    const css = args.css.length > 0 ? args.css : [...(config.css ?? [])];
    const safelist = args.safelist.length > 0 ? args.safelist : [...(config.safelist ?? [])];
    const safelistPatterns =
        args.safelistPatterns.length > 0
            ? args.safelistPatterns
            : [...(config.safelistPatterns ?? [])];

    const keepDynamicPatterns =
        args.dynamicPatterns.length > 0
            ? args.dynamicPatterns
            : args.keepDynamicPatterns === true
              ? true
              : config.keepDynamicPatterns;

    const report: ReportOptions | undefined =
        args.reportJson !== undefined ||
        args.reportHtml !== undefined ||
        args.reportCi !== undefined
            ? {
                  json: args.reportJson,
                  html: args.reportHtml,
                  ci: args.reportCi,
              }
            : config.report;

    return {
        configPath: args.configPath,
        cwd,
        content,
        css,
        out: args.out ?? config.out,
        safelist,
        safelistPatterns,
        keepDynamicPatterns,
        minify: args.minify ?? config.minify ?? false,
        analyze: args.analyze ?? config.analyze,
        report,
        verbose: args.verbose ?? config.verbose ?? false,
        stats: args.stats ?? config.stats ?? false,
        watch: args.watch ?? config.watch ?? false,
    };
}

export function normalizeReportOptions(
    report: ReportOptions | undefined,
): ReportOptions | undefined {
    if (!report) return undefined;
    if (!report.json && !report.html && !report.ci) return undefined;
    return report;
}

export function validateResolvedOptions(options: ResolvedOptions): void {
    if (options.content.length === 0) {
        throw new Error('At least one --content glob is required.');
    }

    if (options.css.length === 0) {
        throw new Error('At least one --css file is required.');
    }
}
