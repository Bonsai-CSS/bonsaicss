import fs from 'fs';
import { createRequire } from 'module';
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
        const require = createRequire(import.meta.url);
        const { createJiti } = require('jiti') as {
            createJiti: (
                filename: string,
                options?: { interopDefault?: boolean; moduleCache?: boolean; fsCache?: boolean },
            ) => (id: string) => unknown;
        };
        const jiti = createJiti(import.meta.url, {
            interopDefault: true,
            moduleCache: false,
            fsCache: false,
        });
        const loaded = jiti(absolutePath);
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

    const ci =
        args.ci !== undefined ||
        args.maxUnusedPercent !== undefined ||
        args.maxFinalKb !== undefined ||
        config.ci
            ? {
                  enabled: args.ci ?? config.ci?.enabled,
                  maxUnusedPercent: args.maxUnusedPercent ?? config.ci?.maxUnusedPercent,
                  maxFinalKb: args.maxFinalKb ?? config.ci?.maxFinalKb,
              }
            : undefined;

    return {
        configPath: args.configPath,
        cwd,
        content,
        css,
        out: args.out ?? config.out,
        safelist,
        safelistPatterns,
        keepDynamicPatterns,
        extractors: config.extractors,
        ci,
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

    if (options.ci?.enabled) {
        if (options.ci.maxUnusedPercent === undefined && options.ci.maxFinalKb === undefined) {
            throw new Error(
                'CI mode requires at least one budget (--max-unused-percent or --max-final-kb).',
            );
        }
    }

    if (options.ci?.maxUnusedPercent !== undefined) {
        if (options.ci.maxUnusedPercent < 0 || options.ci.maxUnusedPercent > 100) {
            throw new Error('--max-unused-percent must be between 0 and 100.');
        }
    }
}
