/**
 * Low-level string utilities for BonsaiCSS.
 * Pure functions — no I/O or side effects.
 */

const REGEX_ESCAPE = /[.*+?^${}()|[\]\\]/g;

/**
 * Escape special regex characters in a string.
 */
export function escapeRegex(value: string): string {
    return value.replace(REGEX_ESCAPE, '\\$&');
}

/**
 * Normalize path separators to forward slashes.
 */
export function normalizeSlashes(value: string): string {
    return value.replace(/\\/g, '/');
}

/**
 * Split a class-list string into individual valid class tokens.
 * Filters out URLs, code artifacts, and invalid identifiers.
 */
export function tokenizeClassList(value: string): string[] {
    return value
        .split(/[\s,]+/g)
        .map(part => part.trim())
        .filter(Boolean)
        .map(part => part.replace(/^['"`]+|['"`]+$/g, ''))
        .filter(part => part.length > 0)
        .filter(part => !part.includes('://'))
        .filter(part => !/[<>{}()[\]=;]/.test(part))
        .filter(part => /^[a-zA-Z0-9_-][a-zA-Z0-9_:\-./]*$/.test(part));
}

/**
 * Split a comma-separated argument list respecting nesting and quotes.
 */
export function splitArguments(args: string): string[] {
    const parts: string[] = [];
    let current = '';
    let quote: string | null = null;
    let depthParen = 0;
    let depthBracket = 0;
    let depthBrace = 0;
    let escaped = false;

    for (const ch of args) {
        if (quote) {
            current += ch;
            if (escaped) {
                escaped = false;
            } else if (ch === '\\') {
                escaped = true;
            } else if (ch === quote) {
                quote = null;
            }
            continue;
        }

        if (ch === '"' || ch === "'" || ch === '`') {
            quote = ch;
            current += ch;
            continue;
        }

        if (ch === '(') depthParen += 1;
        if (ch === ')') depthParen = Math.max(0, depthParen - 1);
        if (ch === '[') depthBracket += 1;
        if (ch === ']') depthBracket = Math.max(0, depthBracket - 1);
        if (ch === '{') depthBrace += 1;
        if (ch === '}') depthBrace = Math.max(0, depthBrace - 1);

        if (ch === ',' && depthParen === 0 && depthBracket === 0 && depthBrace === 0) {
            if (current.trim()) parts.push(current.trim());
            current = '';
            continue;
        }

        current += ch;
    }

    if (current.trim()) parts.push(current.trim());
    return parts;
}

/**
 * Parse an array of string/RegExp entries into RegExp instances.
 * Invalid regex strings are silently ignored.
 */
export function parsePatternEntries(entries?: ReadonlyArray<string | RegExp>): RegExp[] {
    if (!entries || entries.length === 0) return [];

    const parsed: RegExp[] = [];
    entries.forEach(entry => {
        if (entry instanceof RegExp) {
            parsed.push(entry);
            return;
        }

        if (typeof entry !== 'string' || !entry.trim()) return;

        const value = entry.trim();
        const slash = /^\/(.+)\/([gimsuy]*)$/.exec(value);

        try {
            if (slash) {
                parsed.push(new RegExp(slash[1] ?? '', slash[2]));
            } else {
                parsed.push(new RegExp(value));
            }
        } catch {
            // Ignore invalid regex patterns from config.
        }
    });

    return parsed;
}

/**
 * Remove duplicate RegExp instances by source+flags.
 */
export function dedupeRegex(input: RegExp[]): RegExp[] {
    const seen = new Set<string>();
    const out: RegExp[] = [];

    input.forEach(re => {
        const key = `${re.source}/${re.flags}`;
        if (seen.has(key)) return;
        seen.add(key);
        out.push(re);
    });

    return out;
}

/**
 * Create a line resolver from a source string.
 * Returned function maps a character index to a 1-based line number.
 */
export function createLineResolver(source: string): (index: number) => number {
    const starts = [0];
    for (let i = 0; i < source.length; i += 1) {
        if (source.charCodeAt(i) === 10) starts.push(i + 1);
    }

    return (index: number): number => {
        if (!Number.isFinite(index) || index <= 0) return 1;
        if (index >= source.length) return starts.length;

        let low = 0;
        let high = starts.length - 1;
        while (low <= high) {
            const mid = (low + high) >> 1;
            if ((starts[mid] ?? 0) <= index) {
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }

        return high + 1;
    };
}
