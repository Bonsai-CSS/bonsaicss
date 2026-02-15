/**
 * Selector utilities used by the pruning engine.
 */

/**
 * Extract class names referenced in a single CSS selector string.
 */
function extractClassesFromSelector(selector: string): string[] {
    const classes: string[] = [];
    const re = /\.([a-zA-Z0-9_\\:\-./]+)/g;
    let match = re.exec(selector);

    while (match) {
        const raw = match[1] ?? '';
        const normalized = raw.replace(/\\([:\\./])/g, '$1');
        if (normalized) {
            classes.push(normalized);
        }
        match = re.exec(selector);
    }

    return classes;
}

/**
 * Check if a selector references any used class.
 */
export function isSelectorUsed(
    selector: string,
    usedClasses: ReadonlySet<string>,
    dynamicPatterns: readonly RegExp[],
    safelistPatterns: readonly RegExp[],
): boolean {
    const classes = extractClassesFromSelector(selector);

    // Selectors without class references (e.g. element selectors, :root) are always kept.
    if (classes.length === 0) return true;

    return classes.some(
        cls =>
            usedClasses.has(cls) ||
            dynamicPatterns.some(p => p.test(cls)) ||
            safelistPatterns.some(p => p.test(cls)),
    );
}
