import * as csstree from 'css-tree';

/**
 * Extract class names from CSS selectors.
 * Handles escaped characters (e.g. `sm\\:grid` → `sm:grid`).
 */
export function collectCssClassNames(css: string): Set<string> {
    const classes = new Set<string>();

    try {
        const ast = csstree.parse(css, {
            parseCustomProperty: true,
        });

        csstree.walk(ast, {
            visit: 'ClassSelector',
            enter(node) {
                const normalized = node.name.replace(/\\([:\\./])/g, '$1');
                if (normalized) {
                    classes.add(normalized);
                }
            },
        });
    } catch {
        // Keep empty set on parse failure.
    }

    return classes;
}
