/**
 * CSS Pruning Engine — walks the CSS AST and removes rules
 * whose selectors reference no used class names.
 */

import * as csstree from 'css-tree';

import type { PrunerOptions, PruneResult, PruneStats, ScanSummary } from './types.js';
import { collectCssClassNames } from './css-classes.js';
import { removeComments } from './pruner-minify.js';
import { PRESERVED_ATRULES, hasCustomProperties } from './pruner-preserve.js';
import { isSelectorUsed } from './pruner-selectors.js';
import { parsePatternEntries, tokenizeClassList } from './utils.js';

function byteLength(value: string): number {
    return new TextEncoder().encode(value).length;
}

/**
 * Prune unused CSS rules based on a set of used class names.
 *
 * @param css - Raw CSS string to prune.
 * @param scan - Scan summary from content scanning.
 * @param options - Additional pruner options.
 * @returns Prune result with cleaned CSS and statistics.
 */
export function pruneCss(css: string, scan: ScanSummary, options?: PrunerOptions): PruneResult {
    const { classes: usedClasses, dynamicPatterns } = scan;
    const effectiveUsedClasses = new Set<string>(usedClasses);

    if (Array.isArray(options?.safelist)) {
        options.safelist.forEach(entry => {
            tokenizeClassList(String(entry)).forEach(token => effectiveUsedClasses.add(token));
        });
    }

    const safelistPatterns = parsePatternEntries(options?.safelistPatterns);

    // Collect all CSS class names for stats tracking.
    const allCssClasses = collectCssClassNames(css);
    const removedClasses: string[] = [];
    const keptClasses: string[] = [];

    let totalRules = 0;
    let removedRules = 0;

    // Parse the CSS AST.
    let ast: csstree.CssNode;
    try {
        ast = csstree.parse(css, {
            parseCustomProperty: true,
        });
    } catch {
        // If CSS is unparseable, return it unchanged.
        return {
            css,
            stats: {
                totalRules: 0,
                removedRules: 0,
                keptRules: 0,
                originalSize: byteLength(css),
                prunedSize: byteLength(css),
            },
            removedClasses: [],
            keptClasses: Array.from(allCssClasses),
        };
    }

    // Walk AST and collect nodes to remove.
    const nodesToRemove: Array<{
        node: csstree.CssNode;
        list: csstree.List<csstree.CssNode>;
        item: csstree.ListItem<csstree.CssNode>;
    }> = [];

    csstree.walk(ast, {
        visit: 'Rule',
        enter(node, item, list) {
            totalRules += 1;

            // Skip rules inside preserved at-rules.
            // The rule-level check happens here; at-rule-level pruning is separate.

            if (node.prelude.type === 'SelectorList') {
                const selectorText = csstree.generate(node.prelude);

                // Preserve :root selectors with custom properties.
                if (
                    selectorText.includes(':root') &&
                    hasCustomProperties(node.prelude as unknown as csstree.Block)
                ) {
                    return;
                }

                // Check individual selectors.
                const selectors: string[] = [];
                node.prelude.children.forEach(selector => {
                    selectors.push(csstree.generate(selector));
                });

                const anyUsed = selectors.some(sel =>
                    isSelectorUsed(sel, effectiveUsedClasses, dynamicPatterns, safelistPatterns),
                );

                if (!anyUsed) {
                    nodesToRemove.push({ node, list, item });
                    removedRules += 1;
                }
            }
        },
    });

    // Remove collected nodes.
    nodesToRemove.forEach(({ list, item }) => {
        list.remove(item);
    });

    // Remove empty at-rules (e.g. @media blocks with all rules pruned).
    const emptyAtRules: Array<{
        node: csstree.CssNode;
        list: csstree.List<csstree.CssNode>;
        item: csstree.ListItem<csstree.CssNode>;
    }> = [];

    csstree.walk(ast, {
        visit: 'Atrule',
        enter(node, item, list) {
            const name = node.name.toLowerCase();

            // Skip always-preserved at-rules.
            if (PRESERVED_ATRULES.has(name)) return;

            // Remove @media/@supports blocks that are now empty.
            if (node.block?.children.isEmpty) {
                emptyAtRules.push({ node, list, item });
            }
        },
    });

    emptyAtRules.forEach(({ list, item }) => {
        list.remove(item);
    });

    // Generate pruned CSS.
    if (options?.minify) {
        removeComments(ast);
    }

    const prunedCss = csstree.generate(ast, options?.minify ? { mode: 'safe' } : undefined);

    // Calculate class-level stats.
    allCssClasses.forEach(cls => {
        if (
            effectiveUsedClasses.has(cls) ||
            dynamicPatterns.some(p => p.test(cls)) ||
            safelistPatterns.some(p => p.test(cls))
        ) {
            keptClasses.push(cls);
        } else {
            removedClasses.push(cls);
        }
    });

    const stats: PruneStats = {
        totalRules,
        removedRules,
        keptRules: totalRules - removedRules,
        originalSize: byteLength(css),
        prunedSize: byteLength(prunedCss),
    };

    return {
        css: prunedCss,
        stats,
        removedClasses: removedClasses.sort(),
        keptClasses: keptClasses.sort(),
    };
}
