/**
 * @module @bonsaicss/esbuild-plugin
 *
 * BonsaiCSS esbuild plugin — prunes unused CSS during esbuild builds.
 *
 * @example
 * ```js
 * import esbuild from 'esbuild';
 * import bonsaiEsbuild from '@bonsaicss/esbuild-plugin';
 *
 * await esbuild.build({
 *     entryPoints: ['src/index.ts'],
 *     bundle: true,
 *     plugins: [
 *         bonsaiEsbuild({
 *             content: ['./src/**\/*.{html,tsx,vue}'],
 *         }),
 *     ],
 * });
 * ```
 */

import fs from 'fs';
import type { Plugin } from 'esbuild';
import { type BonsaiOptions, type BonsaiContext, createBonsaiContext } from '@bonsaicss/core';

// ─── Plugin Options ──────────────────────────────────────────────────────────

export interface BonsaiEsbuildOptions extends BonsaiOptions {
    /**
     * CSS file filter regex for the onLoad hook.
     * @default /\.css$/
     */
    readonly filter?: RegExp;

    /**
     * When `true`, logs pruning stats to stderr.
     * @default false
     */
    readonly verbose?: boolean;
}

// ─── Plugin Implementation ──────────────────────────────────────────────────

export default function bonsaiEsbuild(options: BonsaiEsbuildOptions): Plugin {
    const filter = options.filter ?? /\.css$/;
    let context: BonsaiContext | null = null;

    function getContext(): BonsaiContext {
        context ??= createBonsaiContext(options);
        return context;
    }

    return {
        name: 'bonsaicss',

        setup(build) {
            // Re-initialize context at the start of each build.
            build.onStart(() => {
                context?.invalidate();
                context = null;
            });

            build.onLoad({ filter }, args => {
                let css: string;
                try {
                    css = fs.readFileSync(args.path, 'utf8');
                } catch {
                    return null;
                }

                const ctx = getContext();
                const pruned = ctx.prune(css);

                if (options.verbose) {
                    const { stats } = pruned;
                    const reduction =
                        stats.originalSize > 0
                            ? ((1 - stats.prunedSize / stats.originalSize) * 100).toFixed(1)
                            : '0.0';

                    console.error(
                        `[bonsaicss] ${args.path}: ` +
                            `${String(stats.removedRules)}/${String(stats.totalRules)} rules removed ` +
                            `(${reduction}% reduction)`,
                    );
                }

                return {
                    contents: pruned.css,
                    loader: 'css',
                };
            });
        },
    };
}

export { bonsaiEsbuild };
