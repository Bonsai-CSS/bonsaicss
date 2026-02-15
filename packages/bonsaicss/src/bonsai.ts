/**
 * BonsaiCSS orchestrator — high-level API that ties together
 * file resolution, content scanning, and CSS pruning.
 */

import fs from 'fs';

import type { BonsaiOptions, BonsaiContext, BonsaiResult, ScanSummary } from './types.js';
import { resolveContentFiles } from './glob.js';
import { scanContentForClassUsage } from './scanner.js';
import { pruneCss } from './pruner.js';
import {
    buildBonsaiReport,
    emitAdvancedReports,
    produceLegacyAnalysisReport,
} from './reporting.js';

/**
 * Run BonsaiCSS: resolve content files → scan for class usage → prune CSS.
 *
 * @example
 * ```ts
 * import { bonsai } from '@bonsaicss/core';
 *
 * const result = bonsai({
 *     content: ['./src/**\/*.{html,tsx}'],
 *     css: fs.readFileSync('./styles.css', 'utf8'),
 * });
 *
 * console.log(result.css);
 * console.log(`Removed ${result.stats.removedRules} rules`);
 * ```
 */
export function bonsai(options: BonsaiOptions): BonsaiResult {
    const startedAt = performance.now();
    const cwd = options.cwd ?? process.cwd();
    const files = resolveContentFiles(options.content, cwd);
    const scan = scanContentForClassUsage(files, options);
    produceLegacyAnalysisReport(scan, options);

    let cssSource: string;
    if (typeof options.css === 'string') {
        cssSource = options.css;
    } else if (Array.isArray(options.css)) {
        cssSource = (options.css as readonly string[])
            .map(cssPath => {
                try {
                    return fs.readFileSync(cssPath, 'utf8');
                } catch {
                    return '';
                }
            })
            .join('\n');
    } else {
        cssSource = '';
    }

    const result = pruneCss(cssSource, scan, options);
    const report = buildBonsaiReport(
        scan,
        result,
        options,
        Math.max(0, performance.now() - startedAt),
    );
    emitAdvancedReports(report, options);

    return {
        ...result,
        report,
    };
}

/**
 * Create a reusable BonsaiCSS context for plugin integrations.
 *
 * The context lazily scans content files on first access and caches
 * the result. Call `invalidate()` to force a re-scan (e.g. on HMR).
 *
 * @example
 * ```ts
 * const ctx = createBonsaiContext({
 *     content: ['./src/**\/*.{html,tsx}'],
 * });
 *
 * // In a build plugin's transform hook:
 * const result = ctx.prune(cssFileContent);
 * ```
 */
export function createBonsaiContext(options: BonsaiOptions): BonsaiContext {
    const cwd = options.cwd ?? process.cwd();
    let cachedScan: ScanSummary | null = null;

    function getScan(): ScanSummary {
        if (!cachedScan) {
            const files = resolveContentFiles(options.content, cwd);
            cachedScan = scanContentForClassUsage(files, options);
            produceLegacyAnalysisReport(cachedScan, options);
        }
        return cachedScan;
    }

    return {
        get scan(): ScanSummary {
            return getScan();
        },

        prune(css: string): BonsaiResult {
            const startedAt = performance.now();
            const scan = getScan();
            const result = pruneCss(css, scan, options);
            const report = buildBonsaiReport(
                scan,
                result,
                options,
                Math.max(0, performance.now() - startedAt),
            );
            emitAdvancedReports(report, options);
            return {
                ...result,
                report,
            };
        },

        invalidate(): void {
            cachedScan = null;
        },
    };
}
