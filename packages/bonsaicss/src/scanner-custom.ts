import fs from 'fs';

import type {
    BonsaiExtractor,
    BonsaiExtractorCallback,
    BonsaiExtractorDefinition,
    ExtractorClassMatch,
    ExtractorContext,
    ExtractorResult,
    ExtractorFileMatcher,
    PrunerOptions,
} from './types.js';
import {
    createLineResolver,
    dedupeRegex,
    normalizeSlashes,
    parsePatternEntries,
    tokenizeClassList,
} from './utils.js';

export interface ScanStringResult {
    classes: Set<string>;
    dynamicPatterns: RegExp[];
    classOrigins: Map<string, Set<string>>;
    warnings: string[];
}

interface CachedFileScan {
    signature: string;
    classes: string[];
    dynamicPatterns: string[];
    classOrigins: Record<string, string[]>;
    warnings: string[];
}

const fileScanCache = new Map<string, CachedFileScan>();

interface NormalizedExtractor {
    readonly name: string;
    readonly test?: ExtractorFileMatcher;
    readonly extract: BonsaiExtractorCallback;
}

function getCustomExtractors(options: PrunerOptions | undefined): readonly BonsaiExtractor[] {
    const extractors = options?.extractors;
    if (!Array.isArray(extractors) || extractors.length === 0) return [];
    return extractors;
}

function toGlobalRegex(pattern: RegExp): RegExp {
    if (pattern.flags.includes('g')) return new RegExp(pattern.source, pattern.flags);
    return new RegExp(pattern.source, `${pattern.flags}g`);
}

function regexExtractor(pattern: RegExp): BonsaiExtractorCallback {
    return ({ source }: ExtractorContext): ExtractorResult => {
        const classes: ExtractorClassMatch[] = [];
        const resolveLine = createLineResolver(source);
        const re = toGlobalRegex(pattern);
        let match = re.exec(source);
        while (match) {
            const captures =
                match.length > 1
                    ? match.slice(1).filter((entry): entry is string => typeof entry === 'string')
                    : [match[0]];
            const line = resolveLine(match.index);
            captures.forEach(capture => {
                tokenizeClassList(capture).forEach(name => {
                    classes.push({ name, line, type: 'literal' });
                });
            });
            match = re.exec(source);
        }
        return { classes };
    };
}

function normalizeExtractor(extractor: BonsaiExtractor, index: number): NormalizedExtractor {
    if (typeof extractor === 'function') {
        return {
            name: `extractor:${String(index + 1)}`,
            extract: extractor,
        };
    }

    const definition = extractor as BonsaiExtractorDefinition;
    if (!definition.extract) {
        throw new Error('Extractor definition must provide an extract strategy.');
    }

    return {
        name: definition.name?.trim() || `extractor:${String(index + 1)}`,
        test: definition.test,
        extract:
            definition.extract instanceof RegExp
                ? regexExtractor(definition.extract)
                : definition.extract,
    };
}

function testPathMatcher(matcher: ExtractorFileMatcher | undefined, filePath: string): boolean {
    if (!matcher) return true;
    if (matcher instanceof RegExp) {
        const flags = matcher.flags.replaceAll('g', '');
        return new RegExp(matcher.source, flags).test(filePath);
    }
    return matcher(filePath);
}

function normalizeLine(line: number | undefined): number {
    if (!Number.isFinite(line) || !line) return 1;
    return Math.max(1, Math.floor(line));
}

function applyExtractorResult(
    result: ExtractorResult | null | undefined,
    sourceLabel: string | undefined,
    classes: Set<string>,
    classOrigins: Map<string, Set<string>>,
    dynamicPatterns: RegExp[],
): void {
    if (!result) return;

    const classEntries = result.classes ?? [];
    classEntries.forEach(entry => {
        if (typeof entry === 'string') {
            tokenizeClassList(entry).forEach(token => {
                classes.add(token);
                if (!sourceLabel) return;
                const existing = classOrigins.get(token);
                const origin = `${sourceLabel}:1`;
                if (existing) {
                    existing.add(origin);
                } else {
                    classOrigins.set(token, new Set([origin]));
                }
            });
            return;
        }

        const match = entry as ExtractorClassMatch;
        tokenizeClassList(match.name).forEach(token => {
            classes.add(token);
            if (!sourceLabel) return;
            const line = normalizeLine(match.line);
            const origin = `${sourceLabel}:${String(line)}`;
            const existing = classOrigins.get(token);
            if (existing) {
                existing.add(origin);
            } else {
                classOrigins.set(token, new Set([origin]));
            }
        });
    });

    dynamicPatterns.push(...parsePatternEntries(result.dynamicPatterns));
}

export function hasCustomExtractors(options: PrunerOptions | undefined): boolean {
    return getCustomExtractors(options).length > 0;
}

export function runCustomExtractors(
    content: string,
    options: PrunerOptions | undefined,
    sourceLabel: string | undefined,
): ScanStringResult {
    const classes = new Set<string>();
    const dynamicPatterns: RegExp[] = [];
    const classOrigins = new Map<string, Set<string>>();
    const warnings: string[] = [];

    const extractors = getCustomExtractors(options);
    const cwd = (options as { cwd?: string } | undefined)?.cwd ?? process.cwd();
    const filePath = normalizeSlashes(sourceLabel ?? '<inline>');
    const context: ExtractorContext = {
        filePath,
        source: content,
        cwd,
    };

    extractors.forEach((extractor, index) => {
        let normalized: NormalizedExtractor = {
            name: `extractor:${String(index + 1)}`,
            extract: () => undefined,
        };
        let result: ExtractorResult | null | undefined;
        try {
            normalized = normalizeExtractor(extractor, index);
            if (!testPathMatcher(normalized.test, filePath)) {
                return;
            }

            result = normalized.extract(context);
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            warnings.push(`[extractor:${String(index + 1)}] ${msg}`);
            return;
        }

        if (result?.warnings?.length) {
            result.warnings.forEach(warning => {
                warnings.push(`[${normalized.name}] ${warning}`);
            });
        }

        applyExtractorResult(result, sourceLabel, classes, classOrigins, dynamicPatterns);
    });

    return {
        classes,
        dynamicPatterns: dedupeRegex(dynamicPatterns),
        classOrigins,
        warnings,
    };
}

function serializeCacheResult(scan: ScanStringResult): CachedFileScan {
    const classOrigins: Record<string, string[]> = {};
    scan.classOrigins.forEach((origins, className) => {
        classOrigins[className] = Array.from(origins);
    });

    return {
        signature: '',
        classes: Array.from(scan.classes),
        dynamicPatterns: scan.dynamicPatterns.map(pattern => pattern.toString()),
        classOrigins,
        warnings: [...scan.warnings],
    };
}

function hydrateCacheResult(cached: CachedFileScan): ScanStringResult {
    const classOrigins = new Map<string, Set<string>>();
    Object.entries(cached.classOrigins).forEach(([className, origins]) => {
        classOrigins.set(className, new Set(origins));
    });

    return {
        classes: new Set(cached.classes),
        dynamicPatterns: parsePatternEntries(cached.dynamicPatterns),
        classOrigins,
        warnings: [...cached.warnings],
    };
}

function cacheSignature(file: string, options: PrunerOptions | undefined): string | null {
    try {
        const stat = fs.statSync(file);
        const mode = `builtin:${String(Boolean(options?.keepDynamicPatterns))}`;
        return `${mode}:${String(stat.mtimeMs)}:${String(stat.size)}`;
    } catch {
        return null;
    }
}

export function readCachedScan(
    file: string,
    options: PrunerOptions | undefined,
): ScanStringResult | null {
    if (hasCustomExtractors(options)) return null;

    const signature = cacheSignature(file, options);
    if (!signature) return null;

    const cached = fileScanCache.get(file);
    if (!cached || cached.signature !== signature) return null;

    return hydrateCacheResult(cached);
}

export function writeCachedScan(
    file: string,
    options: PrunerOptions | undefined,
    scan: ScanStringResult,
): void {
    if (hasCustomExtractors(options)) return;

    const signature = cacheSignature(file, options);
    if (!signature) return;

    const cached = serializeCacheResult(scan);
    cached.signature = signature;
    fileScanCache.set(file, cached);
}
