export function collectDynamicPrefixWarnings(files: Record<string, string>): {
    patterns: RegExp[];
    warnings: string[];
} {
    const prefixes = new Set<string>();

    Object.values(files).forEach(source => {
        const concatMatches = source.matchAll(/['"`]([a-zA-Z0-9_-]+-)['"`]\s*\+/g);
        for (const match of concatMatches) {
            const prefix = match[1]?.trim();
            if (prefix) prefixes.add(prefix);
        }

        const templateMatches = source.matchAll(/`([^`]*?)\$\{[^}]+\}([^`]*)`/g);
        for (const match of templateMatches) {
            const left = (match[1] ?? '').split(/\s+/).find(part => part.endsWith('-'));
            if (left) prefixes.add(left.trim());
        }
    });

    const patterns: RegExp[] = [];
    const warnings: string[] = [];

    prefixes.forEach(prefix => {
        const cleanPrefix = prefix.replace(/[^a-zA-Z0-9_-]/g, '');
        if (!cleanPrefix) return;
        patterns.push(new RegExp(`^${cleanPrefix}`));
        warnings.push(
            `Dynamic class pattern detected: ${cleanPrefix}*\nSuggestion: add safelist /^${cleanPrefix}/`,
        );
    });

    return { patterns, warnings };
}
