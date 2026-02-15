/**
 * @module @bonsaicss/webpack-plugin
 *
 * BonsaiCSS webpack plugin — prunes unused CSS during webpack builds.
 *
 * @example
 * ```js
 * // webpack.config.js
 * const BonsaiCssPlugin = require('@bonsaicss/webpack-plugin');
 *
 * module.exports = {
 *     plugins: [
 *         new BonsaiCssPlugin({
 *             content: ['./src/**\/*.{html,tsx,vue}'],
 *         }),
 *     ],
 * };
 * ```
 */

import type { Compiler, Compilation, sources as WebpackSources } from 'webpack';
import { type BonsaiOptions, type BonsaiContext, createBonsaiContext } from '@bonsaicss/core';

// ─── Plugin Options ──────────────────────────────────────────────────────────

export interface BonsaiWebpackOptions extends BonsaiOptions {
    /**
     * File extensions to process in the asset pipeline.
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

const PLUGIN_NAME = 'BonsaiCssPlugin';

export class BonsaiCssPlugin {
    private readonly options: BonsaiWebpackOptions;
    private context: BonsaiContext | null = null;

    constructor(options: BonsaiWebpackOptions) {
        this.options = options;
    }

    private getContext(): BonsaiContext {
        this.context ??= createBonsaiContext(this.options);
        return this.context;
    }

    apply(compiler: Compiler): void {
        const extensions = this.options.extensions ?? ['.css'];

        compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation: Compilation) => {
            compilation.hooks.processAssets.tap(
                {
                    name: PLUGIN_NAME,
                    stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_SIZE,
                },
                assets => {
                    // Invalidate context for fresh scan each compilation.
                    this.context?.invalidate();
                    this.context = null;

                    const ctx = this.getContext();
                    const { RawSource } = compiler.webpack.sources;

                    for (const [name, asset] of Object.entries(assets)) {
                        const isCss = extensions.some(ext => name.endsWith(ext));
                        if (!isCss) continue;

                        const originalCss = asset.source().toString();
                        const pruned = ctx.prune(originalCss);

                        if (this.options.verbose) {
                            const { stats } = pruned;
                            const reduction =
                                stats.originalSize > 0
                                    ? ((1 - stats.prunedSize / stats.originalSize) * 100).toFixed(1)
                                    : '0.0';

                            console.error(
                                `[bonsaicss] ${name}: ` +
                                    `${String(stats.removedRules)}/${String(stats.totalRules)} rules removed ` +
                                    `(${reduction}% reduction)`,
                            );
                        }

                        compilation.updateAsset(
                            name,
                            new RawSource(pruned.css) as unknown as WebpackSources.Source,
                        );
                    }
                },
            );
        });
    }
}

export default BonsaiCssPlugin;
