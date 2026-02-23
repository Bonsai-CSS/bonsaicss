/**
 * Content scanner — extracts class names from HTML, JSX, Vue, Svelte,
 * Angular/Astro/Solid templates, server templates (Blade/ERB),
 * and JavaScript/TypeScript source files.
 */

import fs from 'fs';
import path from 'path';

import type { PrunerOptions, ScanSummary } from './types.js';
import type { ScanStringResult } from './scanner-custom.js';
import {
    hasCustomExtractors,
    readCachedScan,
    runCustomExtractors,
    writeCachedScan,
} from './scanner-custom.js';
import {
    escapeRegex,
    normalizeSlashes,
    tokenizeClassList,
    splitArguments,
    createLineResolver,
    parsePatternEntries,
    dedupeRegex,
} from './utils.js';

function extractQuotedStrings(expression: string): string[] {
    const strings: string[] = [];
    const re = /'([^'\\]*(?:\\.[^'\\]*)*)'|"([^"\\]*(?:\\.[^"\\]*)*)"/g;
    let match = re.exec(expression);
    while (match) {
        strings.push(match[1] ?? match[2] ?? '');
        match = re.exec(expression);
    }
    return strings;
}

function extractTemplateStatics(expression: string): string[] {
    const values: string[] = [];
    const re = /`([\s\S]*?)`/g;
    let match = re.exec(expression);
    while (match) {
        const raw = match[1] ?? '';
        raw.split(/\$\{[^}]*\}/g).forEach(part => {
            if (part.trim()) values.push(part);
        });
        match = re.exec(expression);
    }
    return values;
}

function extractObjectKeys(expression: string): string[] {
    const keys: string[] = [];
    const re = /(?:^|[{,]\s*)(['"]?)([a-zA-Z0-9_-][a-zA-Z0-9_:\-./]*)\1\s*:/g;
    let match = re.exec(expression);
    while (match) {
        keys.push(match[2] ?? '');
        match = re.exec(expression);
    }
    return keys;
}

function collectConstMap(content: string): Map<string, string[]> {
    const map = new Map<string, string[]>();
    const declarationRe = /\b(?:const|let|var)\s+([a-zA-Z_$][\w$]*)\s*=\s*([^;]+);?/g;
    let match = declarationRe.exec(content);

    while (match) {
        const name = match[1] ?? '';
        const expr = match[2] ?? '';
        const tokens = new Set<string>();

        extractQuotedStrings(expr).forEach(value => {
            tokenizeClassList(value).forEach(token => tokens.add(token));
        });
        extractTemplateStatics(expr).forEach(value => {
            tokenizeClassList(value).forEach(token => tokens.add(token));
        });

        if (tokens.size > 0) {
            map.set(name, Array.from(tokens));
        }

        match = declarationRe.exec(content);
    }

    return map;
}

function resolveIdentifierTokens(expression: string, constMap: Map<string, string[]>): string[] {
    const out: string[] = [];
    const ids = expression.match(/\b[a-zA-Z_$][\w$]*\b/g) ?? [];
    ids.forEach(id => {
        const found = constMap.get(id);
        if (found && found.length > 0) {
            out.push(...found);
        }
    });
    return out;
}

function deriveDynamicPatterns(expression: string): RegExp[] {
    if (!/[+]|`[\s\S]*\$\{/.test(expression)) {
        return [];
    }

    const patterns: RegExp[] = [];
    const staticParts = [
        ...extractQuotedStrings(expression),
        ...extractTemplateStatics(expression),
    ];
    staticParts.forEach(part => {
        tokenizeClassList(part).forEach(token => {
            if (token.endsWith('-')) {
                patterns.push(new RegExp(`^${escapeRegex(token)}`));
            }
        });
    });
    return patterns;
}

function extractTokensFromExpression(
    expression: string,
    constMap: Map<string, string[]>,
    collectDynamicPatterns: boolean,
): { tokens: string[]; dynamicPatterns: RegExp[] } {
    const tokens = new Set<string>();
    const dynamicPatterns: RegExp[] = [];

    const fromStrings = [
        ...extractQuotedStrings(expression),
        ...extractTemplateStatics(expression),
        ...extractObjectKeys(expression),
    ];

    fromStrings.forEach(value => {
        tokenizeClassList(value).forEach(token => tokens.add(token));
    });

    resolveIdentifierTokens(expression, constMap).forEach(token => tokens.add(token));

    if (collectDynamicPatterns) {
        dynamicPatterns.push(...deriveDynamicPatterns(expression));
    }

    return { tokens: Array.from(tokens), dynamicPatterns };
}

function collectFromRegexCapture(
    content: string,
    re: RegExp,
    constMap: Map<string, string[]>,
    addToken: (token: string, index: number) => void,
    dynamicPatterns: RegExp[],
    collectDynamicPatterns: boolean,
): void {
    let match = re.exec(content);
    while (match) {
        const captures = match
            .slice(1)
            .filter((value): value is string => typeof value === 'string');
        const expression = captures.length > 0 ? (captures[captures.length - 1] ?? '') : '';
        const parsed = extractTokensFromExpression(expression, constMap, collectDynamicPatterns);
        const matchIndex = match.index;
        parsed.tokens.forEach(token => addToken(token, matchIndex));
        dynamicPatterns.push(...parsed.dynamicPatterns);
        match = re.exec(content);
    }
}

function collectFromMethodArgs(
    content: string,
    re: RegExp,
    constMap: Map<string, string[]>,
    addToken: (token: string, index: number) => void,
    dynamicPatterns: RegExp[],
    collectDynamicPatterns: boolean,
    argIndex: number | null = null,
): void {
    let match = re.exec(content);
    while (match) {
        const allArgs = match[1] ?? '';
        const args = splitArguments(allArgs);
        const toParse =
            argIndex === null
                ? args
                : argIndex >= 0 && argIndex < args.length
                  ? [args[argIndex] ?? '']
                  : [];

        const matchIndex = match.index;
        toParse.forEach(arg => {
            const parsed = extractTokensFromExpression(arg, constMap, collectDynamicPatterns);
            parsed.tokens.forEach(token => addToken(token, matchIndex));
            dynamicPatterns.push(...parsed.dynamicPatterns);
        });

        match = re.exec(content);
    }
}

function addClassToken(
    token: string,
    index: number,
    classes: Set<string>,
    classOrigins: Map<string, Set<string>>,
    sourceLabel: string | undefined,
    resolveLine: (offset: number) => number,
): void {
    classes.add(token);
    if (!sourceLabel) return;

    const line = resolveLine(index);
    const origin = `${sourceLabel}:${String(line)}`;
    const existing = classOrigins.get(token);
    if (existing) {
        existing.add(origin);
        return;
    }
    classOrigins.set(token, new Set([origin]));
}

/**
 * Scan a single content string and extract class tokens.
 * @internal — used by `scanContentForClassUsage`.
 */
export function scanContentString(
    content: string,
    options: PrunerOptions | undefined,
    sourceLabel?: string,
): ScanStringResult {
    if (hasCustomExtractors(options)) {
        return runCustomExtractors(content, options, sourceLabel);
    }

    const classes = new Set<string>();
    const dynamicPatterns: RegExp[] = [];
    const classOrigins = new Map<string, Set<string>>();
    const constMap = collectConstMap(content);
    const collectDynamic = Boolean(options?.keepDynamicPatterns);
    const resolveLine = createLineResolver(content);
    const addToken = (token: string, index: number): void => {
        addClassToken(token, index, classes, classOrigins, sourceLabel, resolveLine);
    };

    const staticClassRe = /(?:^|[\s<])class\s*=\s*["']([^"']+)["']/g;
    let staticClassMatch = staticClassRe.exec(content);
    while (staticClassMatch) {
        const index = staticClassMatch.index;
        const value = staticClassMatch[1] ?? '';
        tokenizeClassList(value).forEach(token => addToken(token, index));
        staticClassMatch = staticClassRe.exec(content);
    }

    const reactClassRe = /\bclassName\s*=\s*["']([^"']+)["']/g;
    let reactClassMatch = reactClassRe.exec(content);
    while (reactClassMatch) {
        const index = reactClassMatch.index;
        const value = reactClassMatch[1] ?? '';
        tokenizeClassList(value).forEach(token => addToken(token, index));
        reactClassMatch = reactClassRe.exec(content);
    }

    const svelteClassRe = /\bclass:([a-zA-Z0-9_-]+)/g;
    let svelteClassDirective = svelteClassRe.exec(content);
    while (svelteClassDirective) {
        addToken(svelteClassDirective[1] ?? '', svelteClassDirective.index);
        svelteClassDirective = svelteClassRe.exec(content);
    }

    const ngClassShortcutRe = /\[class\.([a-zA-Z0-9_-]+)\]\s*=\s*["'][^"']*["']/g;
    let ngClassShortcut = ngClassShortcutRe.exec(content);
    while (ngClassShortcut) {
        addToken(ngClassShortcut[1] ?? '', ngClassShortcut.index);
        ngClassShortcut = ngClassShortcutRe.exec(content);
    }

    collectFromRegexCapture(
        content,
        /\bclassName\s*=\s*\{([^}]*)\}/g,
        constMap,
        addToken,
        dynamicPatterns,
        collectDynamic,
    );
    collectFromRegexCapture(
        content,
        /\bclassList\s*=\s*\{([^}]*)\}/g,
        constMap,
        addToken,
        dynamicPatterns,
        collectDynamic,
    );
    collectFromRegexCapture(
        content,
        /:class\s*=\s*(["'])([\s\S]*?)\1/g,
        constMap,
        addToken,
        dynamicPatterns,
        collectDynamic,
    );
    collectFromRegexCapture(
        content,
        /\bclass:list\s*=\s*(["'])([\s\S]*?)\1/g,
        constMap,
        addToken,
        dynamicPatterns,
        collectDynamic,
    );
    collectFromRegexCapture(
        content,
        /\bclass:list\s*=\s*\{([^}]*)\}/g,
        constMap,
        addToken,
        dynamicPatterns,
        collectDynamic,
    );
    collectFromRegexCapture(
        content,
        /\[ngClass\]\s*=\s*(["'])([\s\S]*?)\1/g,
        constMap,
        addToken,
        dynamicPatterns,
        collectDynamic,
    );
    collectFromRegexCapture(
        content,
        /\bclass\s*=\s*\{([^}]*)\}/g,
        constMap,
        addToken,
        dynamicPatterns,
        collectDynamic,
    );
    collectFromRegexCapture(
        content,
        /\.setAttribute\s*\(\s*['"]class['"]\s*,\s*([^)]+)\)/g,
        constMap,
        addToken,
        dynamicPatterns,
        collectDynamic,
    );
    collectFromRegexCapture(
        content,
        /\.className\s*=\s*([^\n;]+)/g,
        constMap,
        addToken,
        dynamicPatterns,
        collectDynamic,
    );

    collectFromMethodArgs(
        content,
        /\bclassList\.(?:add|remove|toggle|contains|replace)\s*\(([^)]*)\)/g,
        constMap,
        addToken,
        dynamicPatterns,
        collectDynamic,
    );
    collectFromMethodArgs(
        content,
        /\b(?:addClass|removeClass|toggleClass|hasClass)\s*\(([^)]*)\)/g,
        constMap,
        addToken,
        dynamicPatterns,
        collectDynamic,
    );
    collectFromMethodArgs(
        content,
        /\brenderer\.(?:addClass|removeClass)\s*\(([^)]*)\)/g,
        constMap,
        addToken,
        dynamicPatterns,
        collectDynamic,
        1,
    );
    collectFromMethodArgs(
        content,
        /\b(?:clsx|classnames)\s*\(([^)]*)\)/g,
        constMap,
        addToken,
        dynamicPatterns,
        collectDynamic,
    );
    collectFromMethodArgs(
        content,
        /@class\s*\(([^)]*)\)/g,
        constMap,
        addToken,
        dynamicPatterns,
        collectDynamic,
    );
    collectFromMethodArgs(
        content,
        /\b(?:class_names|classNames)\s*\(([^)]*)\)/g,
        constMap,
        addToken,
        dynamicPatterns,
        collectDynamic,
    );
    collectFromRegexCapture(
        content,
        /\bclass:\s*(["'])([\s\S]*?)\1/g,
        constMap,
        addToken,
        dynamicPatterns,
        collectDynamic,
    );

    return {
        classes,
        dynamicPatterns: dedupeRegex(dynamicPatterns),
        classOrigins,
        warnings: [],
    };
}

/**
 * Scan multiple content files and aggregate class usage data.
 */
export function scanContentForClassUsage(
    files: readonly string[],
    options?: PrunerOptions & { cwd?: string },
): ScanSummary {
    const classes = new Set<string>();
    const dynamicPatterns: RegExp[] = [];
    const classOrigins = new Map<string, Set<string>>();
    const warnings: string[] = [];

    files.forEach(file => {
        let content = '';
        let sourceLabel = normalizeSlashes(path.relative(options?.cwd ?? process.cwd(), file));
        if (!sourceLabel) sourceLabel = normalizeSlashes(file);

        const cached = readCachedScan(file, options);
        if (cached) {
            cached.classes.forEach(token => classes.add(token));
            dynamicPatterns.push(...cached.dynamicPatterns);
            cached.classOrigins.forEach((origins, className) => {
                const existing = classOrigins.get(className);
                if (!existing) {
                    classOrigins.set(className, new Set(origins));
                    return;
                }
                origins.forEach(origin => existing.add(origin));
            });
            if (cached.warnings.length > 0) warnings.push(...cached.warnings);
            return;
        }

        try {
            content = fs.readFileSync(file, 'utf8');
        } catch {
            return;
        }

        const scan = scanContentString(content, options, sourceLabel);
        scan.classes.forEach(token => classes.add(token));
        dynamicPatterns.push(...scan.dynamicPatterns);
        scan.classOrigins.forEach((origins, className) => {
            const existing = classOrigins.get(className);
            if (!existing) {
                classOrigins.set(className, new Set(origins));
                return;
            }
            origins.forEach(origin => existing.add(origin));
        });
        if (scan.warnings.length > 0) warnings.push(...scan.warnings);

        writeCachedScan(file, options, scan);
    });

    if (Array.isArray(options?.safelist)) {
        options.safelist.forEach(item => {
            tokenizeClassList(item as string).forEach(token => classes.add(token));
        });
    }

    if (Array.isArray(options?.keepDynamicPatterns)) {
        dynamicPatterns.push(
            ...parsePatternEntries(options.keepDynamicPatterns as ReadonlyArray<string | RegExp>),
        );
    }

    return {
        classes,
        dynamicPatterns: dedupeRegex(dynamicPatterns),
        filesScanned: files.length,
        classOrigins,
        warnings,
    };
}

/**
 * Parse regex patterns from config (string or RegExp).
 */
export function parseSafelistPatterns(entries?: ReadonlyArray<string | RegExp>): RegExp[] {
    return parsePatternEntries(entries);
}

export { collectCssClassNames } from './css-classes.js';
