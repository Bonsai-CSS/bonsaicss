import * as csstree from 'css-tree';

/** At-rules that are always preserved regardless of class usage. */
export const PRESERVED_ATRULES = new Set([
    'charset',
    'import',
    'font-face',
    'keyframes',
    'namespace',
    'page',
    'property',
    'counter-style',
    'font-feature-values',
    'font-palette-values',
    'layer',
]);

/**
 * Check if a declaration block contains CSS custom properties (--*).
 */
export function hasCustomProperties(block: csstree.Block): boolean {
    let found = false;
    csstree.walk(block, {
        visit: 'Declaration',
        enter(node) {
            if (node.property.startsWith('--')) {
                found = true;
            }
        },
    });
    return found;
}
