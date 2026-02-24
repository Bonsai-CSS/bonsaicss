import fs from 'fs';
import path from 'path';

import { parsePatternEntries } from './utils.js';

export interface CachedScanEntry {
    signature: string;
    classes: string[];
    dynamicPatterns: string[];
    classOrigins: Record<string, string[]>;
    warnings: string[];
}

interface PersistentScanCacheFile {
    version: number;
    entries: Record<string, CachedScanEntry>;
}

export interface ScanStringLike {
    classes: Set<string>;
    dynamicPatterns: RegExp[];
    classOrigins: Map<string, Set<string>>;
    warnings: string[];
}

const CACHE_VERSION = 1;
const CACHE_FILE = `scan-cache-v${String(CACHE_VERSION)}.json`;

function toKey(file: string): string {
    return path.resolve(file);
}

export function resolvePersistentScanCachePath(cwd: string): string {
    return path.resolve(cwd, 'node_modules/.cache/bonsaicss', CACHE_FILE);
}

export function loadPersistentScanCache(cwd: string): Map<string, CachedScanEntry> {
    const cachePath = resolvePersistentScanCachePath(cwd);
    if (!fs.existsSync(cachePath)) return new Map();

    try {
        const raw = fs.readFileSync(cachePath, 'utf8');
        const parsed: unknown = JSON.parse(raw);

        if (!isPersistentScanCacheFile(parsed)) {
            return new Map();
        }

        if (parsed.version !== CACHE_VERSION) {
            return new Map();
        }

        return new Map(Object.entries(parsed.entries));
    } catch {
        return new Map();
    }
}

export function isPersistentScanCacheFile(value: unknown): value is PersistentScanCacheFile {
    if (typeof value !== 'object' || value === null) {
        return false;
    }

    const obj = value as Record<string, unknown>;

    return (
        typeof obj.version === 'number' && typeof obj.entries === 'object' && obj.entries !== null
    );
}

export function savePersistentScanCache(cwd: string, cache: Map<string, CachedScanEntry>): void {
    const cachePath = resolvePersistentScanCachePath(cwd);
    const entries: Record<string, CachedScanEntry> = {};
    cache.forEach((value, key) => {
        entries[key] = value;
    });

    try {
        fs.mkdirSync(path.dirname(cachePath), { recursive: true });
        fs.writeFileSync(
            cachePath,
            JSON.stringify(
                {
                    version: CACHE_VERSION,
                    entries,
                } satisfies PersistentScanCacheFile,
                null,
                2,
            ),
            'utf8',
        );
    } catch {
        // Best-effort cache persistence.
    }
}

export function readPersistentScanEntry(
    cache: Map<string, CachedScanEntry>,
    file: string,
    signature: string,
): ScanStringLike | null {
    const key = toKey(file);
    const entry = cache.get(key);
    if (entry?.signature !== signature) return null;

    const classOrigins = new Map<string, Set<string>>();
    Object.entries(entry.classOrigins).forEach(([className, origins]) => {
        classOrigins.set(className, new Set(origins));
    });

    return {
        classes: new Set(entry.classes),
        dynamicPatterns: parsePatternEntries(entry.dynamicPatterns),
        classOrigins,
        warnings: [...entry.warnings],
    };
}

export function writePersistentScanEntry(
    cache: Map<string, CachedScanEntry>,
    file: string,
    signature: string,
    scan: ScanStringLike,
): void {
    const classOrigins: Record<string, string[]> = {};
    scan.classOrigins.forEach((origins, className) => {
        classOrigins[className] = Array.from(origins);
    });

    cache.set(toKey(file), {
        signature,
        classes: Array.from(scan.classes),
        dynamicPatterns: scan.dynamicPatterns.map(pattern => pattern.toString()),
        classOrigins,
        warnings: [...scan.warnings],
    });
}
