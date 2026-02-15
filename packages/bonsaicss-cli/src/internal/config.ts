import fs from 'fs';
import path from 'path';

import type { CliConfig, ParsedArgs, ReportOptions, ResolvedOptions } from './types.js';

export function resolveMaybeAbsolute(base: string, target: string): string {
    if (path.isAbsolute(target)) return target;
    return path.resolve(base, target);
}

export function loadConfig(configPath: string): CliConfig {
    const absolutePath = resolveMaybeAbsolute(process.cwd(), configPath);
    if (!fs.existsSync(absolutePath)) {
        throw new Error(`Config file not found: ${absolutePath}`);
    }

    if (!absolutePath.endsWith('.json')) {
        throw new Error('Only JSON config files are supported by --config');
    }

    try {
        const raw = fs.readFileSync(absolutePath, 'utf8');
        return JSON.parse(raw) as CliConfig;
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        throw new Error(`Invalid config JSON: ${message}`);
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
