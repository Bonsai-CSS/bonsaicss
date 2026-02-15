/**
 * @module @bonsaicss/postcss-plugin
 *
 * BonsaiCSS PostCSS plugin — prunes unused CSS during PostCSS processing.
 *
 * @example
 * ```js
 * // postcss.config.js
 * import bonsaiPostcss from '@bonsaicss/postcss-plugin';
 *
 * export default {
 *     plugins: [
 *         bonsaiPostcss({
 *             content: ['./src/**\/*.{html,tsx,vue}'],
 *         }),
 *     ],
 * };
 * ```
 */

import type { PluginCreator } from 'postcss';
import { type BonsaiOptions, type BonsaiContext, createBonsaiContext } from '@bonsaicss/core';

// ─── Plugin Options ──────────────────────────────────────────────────────────

export interface BonsaiPostcssOptions extends BonsaiOptions {
    /**
     * When `true`, logs pruning stats to stderr.
     * @default false
     */
    readonly verbose?: boolean;
}

// ─── Plugin Implementation ──────────────────────────────────────────────────

const bonsaiPostcss: PluginCreator<BonsaiPostcssOptions> = opts => {
    const options = opts ?? ({ content: [] } as BonsaiPostcssOptions);
    let context: BonsaiContext | null = null;

    function getContext(): BonsaiContext {
        context ??= createBonsaiContext(options);
        return context;
    }

    return {
        postcssPlugin: 'bonsaicss',

        Once(root, { result }) {
            const ctx = getContext();
            const originalCss = root.toString();
            const pruned = ctx.prune(originalCss);

            if (options.verbose) {
                const { stats } = pruned;
                const reduction =
                    stats.originalSize > 0
                        ? ((1 - stats.prunedSize / stats.originalSize) * 100).toFixed(1)
                        : '0.0';

                console.error(
                    `[bonsaicss] ${result.opts.from ?? 'unknown'}: ` +
                        `${String(stats.removedRules)}/${String(stats.totalRules)} rules removed ` +
                        `(${reduction}% reduction)`,
                );
            }

            // Replace the PostCSS tree with pruned CSS.
            // eslint-disable-next-line @typescript-eslint/consistent-type-imports
            const postcss = require('postcss') as typeof import('postcss');
            const newRoot = postcss.parse(pruned.css, {
                from: result.opts.from,
            });
            root.removeAll();
            newRoot.each(node => {
                root.append(node.clone());
            });
        },
    };
};

bonsaiPostcss.postcss = true;

export default bonsaiPostcss;
export { bonsaiPostcss };
