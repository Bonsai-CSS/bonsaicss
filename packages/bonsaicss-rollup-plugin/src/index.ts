/**
 * @module @bonsaicss/rollup-plugin
 *
 * BonsaiCSS Rollup plugin — prunes unused CSS during Rollup builds.
 *
 * @example
 * ```js
 * // rollup.config.js
 * import bonsaiRollup from '@bonsaicss/rollup-plugin';
 *
 * export default {
 *     plugins: [
 *         bonsaiRollup({
 *             content: ['./src/**\/*.{html,tsx,vue}'],
 *         }),
 *     ],
 * };
 * ```
 */

import type { Plugin } from 'rollup';
import { type BonsaiOptions, type BonsaiContext, createBonsaiContext } from '@bonsaicss/core';

// ─── Plugin Options ──────────────────────────────────────────────────────────

export interface BonsaiRollupOptions extends BonsaiOptions {
    /**
     * File extensions to process.
     * @default ['.css']
     */
    readonly extensions?: readonly string[];

    /**
     * When `true`, logs pruning stats to stderr.
     * @default false
     */
    readonly verbose?: boolean;
}

// ─── Plugin Implementation ──────────────────────────────────────────────────

export default function bonsaiRollup(options: BonsaiRollupOptions): Plugin {
    const extensions = options.extensions ?? ['.css'];
    let context: BonsaiContext | null = null;

    function getContext(): BonsaiContext {
        context ??= createBonsaiContext(options);
        return context;
    }

    function isCssFile(id: string): boolean {
        return extensions.some(ext => id.endsWith(ext));
    }

    return {
        name: 'bonsaicss',

        buildStart() {
            // Invalidate context at the start of each build for fresh scanning.
            context?.invalidate();
            context = null;
        },

        transform(code, id) {
            if (!isCssFile(id)) return null;

            const ctx = getContext();
            const pruned = ctx.prune(code);

            if (options.verbose) {
                const { stats } = pruned;
                const reduction =
                    stats.originalSize > 0
                        ? ((1 - stats.prunedSize / stats.originalSize) * 100).toFixed(1)
                        : '0.0';

                console.error(
                    `[bonsaicss] ${id}: ` +
                        `${String(stats.removedRules)}/${String(stats.totalRules)} rules removed ` +
                        `(${reduction}% reduction)`,
                );
            }

            return {
                code: pruned.css,
                map: null,
            };
        },
    };
}

export { bonsaiRollup };
