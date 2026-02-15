/**
 * Glob pattern expansion and file-system walking utilities.
 */

import fs from 'fs';
import path from 'path';
import { normalizeSlashes, escapeRegex } from './utils.js';

/**
 * Expand brace patterns (e.g. `"*.{html,tsx}"` → `["*.html", "*.tsx"]`).
 */
export function expandBraces(pattern: string): string[] {
    const match = /\{([^{}]+)\}/.exec(pattern);
    if (!match) return [pattern];

    const [full, inner] = match;
    if (!full || !inner) return [pattern];

    const parts = inner.split(',').map(part => part.trim());
    const expanded: string[] = [];

    parts.forEach(part => {
        const replaced = pattern.replace(full, part);
        expanded.push(...expandBraces(replaced));
    });

    return expanded;
}

/**
 * Convert a glob pattern to a RegExp.
 *
 * Supports `*`, `**`, and `?` wildcards.
 */
export function globToRegExp(glob: string): RegExp {
    const src = normalizeSlashes(glob);
    let i = 0;
    let out = '^';

    while (i < src.length) {
        const ch = src.charAt(i);

        if (ch === '*') {
            if (src[i + 1] === '*') {
                i += 2;
                if (src[i] === '/') {
                    i += 1;
                    out += '(?:.*\\/)?';
                } else {
                    out += '.*';
                }
                continue;
            }

            out += '[^/]*';
            i += 1;
            continue;
        }

        if (ch === '?') {
            out += '[^/]';
            i += 1;
            continue;
        }

        out += escapeRegex(ch);
        i += 1;
    }

    out += '$';
    return new RegExp(out);
}

/**
 * Check if a pattern contains glob tokens (`*`, `?`, `{`).
 */
export function hasGlobToken(pattern: string): boolean {
    return /[*?{]/.test(pattern);
}

/**
 * Determine the deepest static directory prefix before the first wildcard.
 */
export function getWalkRoot(absPattern: string): string {
    const normalized = normalizeSlashes(absPattern);
    const wildcardIndex = normalized.search(/[*?{]/);
    if (wildcardIndex === -1) return normalized;

    const slashIndex = normalized.lastIndexOf('/', wildcardIndex);
    if (slashIndex === -1) return '/';

    return normalized.slice(0, slashIndex);
}

/**
 * Recursively walk a directory tree and return all file paths.
 */
export function walkFiles(rootDir: string): string[] {
    const result: string[] = [];
    const stack = [rootDir];

    while (stack.length > 0) {
        const current = stack.pop();
        if (!current) continue;

        let entries: fs.Dirent[];
        try {
            entries = fs.readdirSync(current, { withFileTypes: true });
        } catch {
            continue;
        }

        entries.forEach(entry => {
            const abs = path.join(current, entry.name);
            if (entry.isDirectory()) {
                stack.push(abs);
                return;
            }
            if (entry.isFile()) {
                result.push(abs);
            }
        });
    }

    return result;
}

/**
 * Resolve content globs into absolute file paths.
 * Supports include/exclude patterns (prefixed with `!`).
 */
export function resolveContentFiles(contentGlobs: readonly string[], cwd: string): string[] {
    const includes = contentGlobs.filter(glob => glob && !glob.startsWith('!'));
    const excludes = contentGlobs
        .filter((glob): glob is string => Boolean(glob) && glob.startsWith('!'))
        .map(glob => glob.slice(1));

    const includeMatches = new Set<string>();

    includes.forEach(rawPattern => {
        expandBraces(rawPattern).forEach(pattern => {
            const absPattern = path.resolve(cwd, pattern);

            if (!hasGlobToken(absPattern)) {
                if (fs.existsSync(absPattern) && fs.statSync(absPattern).isFile()) {
                    includeMatches.add(path.resolve(absPattern));
                }
                return;
            }

            const root = getWalkRoot(absPattern);
            const matcher = globToRegExp(normalizeSlashes(absPattern));
            const files = walkFiles(root);
            files.forEach(file => {
                const normalized = normalizeSlashes(path.resolve(file));
                if (matcher.test(normalized)) {
                    includeMatches.add(path.resolve(file));
                }
            });
        });
    });

    const excluded = new Set<string>();
    excludes.forEach(rawPattern => {
        expandBraces(rawPattern).forEach(pattern => {
            const absPattern = path.resolve(cwd, pattern);
            const matcher = globToRegExp(normalizeSlashes(absPattern));
            includeMatches.forEach(file => {
                if (matcher.test(normalizeSlashes(file))) {
                    excluded.add(file);
                }
            });
        });
    });

    return Array.from(includeMatches)
        .filter(file => !excluded.has(file))
        .sort((a, b) => a.localeCompare(b));
}
