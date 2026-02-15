export function parseSafelistEntries(entries: string[]): {
    safelist: string[];
    safelistPatterns: RegExp[];
    warnings: string[];
} {
    const safelist: string[] = [];
    const safelistPatterns: RegExp[] = [];
    const warnings: string[] = [];

    for (const raw of entries) {
        const entry = raw.trim();
        if (!entry) continue;

        const literalRegex = /^\/(.*)\/([gimsuy]*)$/.exec(entry);
        if (literalRegex) {
            try {
                safelistPatterns.push(new RegExp(literalRegex[1] ?? '', literalRegex[2] ?? ''));
            } catch {
                warnings.push(`Invalid regex safelist entry ignored: ${entry}`);
            }
            continue;
        }

        if (/[*+?()[\]{}|\\.^$]/.test(entry)) {
            try {
                safelistPatterns.push(new RegExp(entry));
            } catch {
                warnings.push(`Invalid safelist pattern ignored: ${entry}`);
            }
            continue;
        }

        safelist.push(entry);
    }

    return { safelist, safelistPatterns, warnings };
}
