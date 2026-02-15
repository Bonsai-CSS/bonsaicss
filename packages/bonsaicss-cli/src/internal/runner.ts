import fs from 'fs';
import path from 'path';

import { bonsai, resolveContentFiles } from '@bonsaicss/core';

import { normalizeReportOptions, resolveMaybeAbsolute, validateResolvedOptions } from './config.js';
import type { ReportOptions, ResolvedOptions, RunResult } from './types.js';

interface CoreBonsaiInput {
    cwd: string;
    content: string[];
    css: string[];
    safelist?: string[];
    safelistPatterns?: string[];
    keepDynamicPatterns?: boolean | string[];
    minify: boolean;
    analyze?: boolean | string;
    report?: ReportOptions;
}

const runBonsai = bonsai as (options: CoreBonsaiInput) => RunResult;
const resolveFiles = resolveContentFiles as (
    contentGlobs: readonly string[],
    cwd: string,
) => string[];

export function runOnce(options: ResolvedOptions): RunResult {
    validateResolvedOptions(options);

    const cssFiles = options.css.map(file => resolveMaybeAbsolute(options.cwd, file));
    cssFiles.forEach(file => {
        if (!fs.existsSync(file)) {
            throw new Error(`CSS file not found: ${file}`);
        }
    });

    const bonsaiOptions: CoreBonsaiInput = {
        cwd: options.cwd,
        content: options.content,
        css: cssFiles,
        safelist: options.safelist.length > 0 ? options.safelist : undefined,
        safelistPatterns:
            options.safelistPatterns.length > 0 ? options.safelistPatterns : undefined,
        keepDynamicPatterns: options.keepDynamicPatterns,
        minify: options.minify,
        analyze: options.analyze,
        report: normalizeReportOptions(options.report),
    };

    const result = runBonsai(bonsaiOptions);

    if (options.out) {
        const outputPath = resolveMaybeAbsolute(options.cwd, options.out);
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
        fs.writeFileSync(outputPath, result.css, 'utf8');
        process.stderr.write(
            `[bonsaicss] removed ${String(result.stats.removedRules)} of ${String(result.stats.totalRules)} rules -> ${outputPath}\n`,
        );
    } else {
        process.stdout.write(result.css);
        if (!result.css.endsWith('\n')) process.stdout.write('\n');
    }

    if (options.verbose) {
        const report = result.report;
        const reductionRatio =
            report?.stats.reductionRatio ??
            (result.stats.originalSize > 0
                ? 1 - result.stats.prunedSize / result.stats.originalSize
                : 0);
        const filesScanned =
            report?.stats.filesScanned ?? resolveFiles(options.content, options.cwd).length;
        const classesDetected =
            report?.stats.classesDetected ??
            result.keptClasses.length + result.removedClasses.length;
        const classesRemoved = report?.stats.classesRemoved ?? result.removedClasses.length;
        const reduction = (reductionRatio * 100).toFixed(2);
        process.stderr.write(
            `[bonsaicss] files=${String(filesScanned)} classes=${String(classesDetected)} ` +
                `removed=${String(classesRemoved)} rulesRemoved=${String(result.stats.removedRules)} reduction=${reduction}%\n`,
        );
        if (report?.warnings.length) {
            report.warnings.forEach((warning: string) => {
                process.stderr.write(`[bonsaicss][warning] ${warning}\n`);
            });
        }
    }

    if (options.stats) {
        const report = result.report;
        const reductionRatio =
            report?.stats.reductionRatio ??
            (result.stats.originalSize > 0
                ? 1 - result.stats.prunedSize / result.stats.originalSize
                : 0);
        const payload = {
            filesScanned:
                report?.stats.filesScanned ?? resolveFiles(options.content, options.cwd).length,
            classesDetected:
                report?.stats.classesDetected ??
                result.keptClasses.length + result.removedClasses.length,
            classesRemoved: report?.stats.classesRemoved ?? result.removedClasses.length,
            totalRules: result.stats.totalRules,
            removedRules: result.stats.removedRules,
            sizeBefore: result.stats.originalSize,
            sizeAfter: result.stats.prunedSize,
            reductionRatio,
            durationMs: report?.stats.durationMs ?? 0,
        };
        process.stderr.write(`${JSON.stringify(payload)}\n`);
    }

    return result;
}

export function collectWatchFiles(options: ResolvedOptions): string[] {
    const contentFiles = resolveFiles(options.content, options.cwd);
    const cssFiles = options.css.map(file => resolveMaybeAbsolute(options.cwd, file));
    const configFiles = options.configPath
        ? [resolveMaybeAbsolute(process.cwd(), options.configPath)]
        : [];

    const unique = new Set<string>([...contentFiles, ...cssFiles, ...configFiles]);
    return Array.from(unique);
}
