import { pruneCss } from '../../../bonsaicss/src/pruner';
import { dedupeRegex } from '../../../bonsaicss/src/utils';

import type { DetectedClass, RunPruneInput, RunPruneResult } from '../engine/types';
import { parseSafelistEntries } from '../engine/safelist';
import { collectDynamicPrefixWarnings } from './dynamic';
import { scanSourceForClasses } from './scanner';
import { isFrameworkFile, now } from './utils';

export function runPrune(input: RunPruneInput): RunPruneResult {
    const totalStart = now();
    const keepDynamic = input.keepDynamicPatterns ?? input.mode === 'safe';

    const parseStart = now();
    const normalizedEntries = input.safelist.flatMap(entry =>
        entry.split(',').map(item => item.trim()),
    );
    const {
        safelist,
        safelistPatterns,
        warnings: safelistWarnings,
    } = parseSafelistEntries(normalizedEntries);

    const dynamicSignal = collectDynamicPrefixWarnings(input.files);
    const parseEnd = now();

    const scanStart = now();
    const detectedClasses: DetectedClass[] = [];
    const usedClasses = new Set<string>();
    const allDynamicPatterns: RegExp[] = [];

    for (const [file, source] of Object.entries(input.files)) {
        if (!isFrameworkFile(file, input.framework)) continue;

        const scanned = scanSourceForClasses(source, file, keepDynamic);
        scanned.classes.forEach(className => usedClasses.add(className));
        scanned.dynamicPatterns.forEach(pattern => allDynamicPatterns.push(pattern));
        scanned.detectedClasses.forEach(entry => detectedClasses.push(entry));
    }

    detectedClasses.sort((a, b) => {
        if (a.name !== b.name) return a.name.localeCompare(b.name);
        if (a.file !== b.file) return a.file.localeCompare(b.file);
        return a.line - b.line;
    });

    const scanEnd = now();

    const pruneStart = now();
    const prune = pruneCss(
        input.css,
        {
            classes: usedClasses,
            dynamicPatterns: dedupeRegex(allDynamicPatterns),
            filesScanned: Object.keys(input.files).length,
            classOrigins: new Map(),
        },
        {
            safelist,
            safelistPatterns:
                input.mode === 'safe' || keepDynamic
                    ? [...safelistPatterns, ...dynamicSignal.patterns]
                    : safelistPatterns,
            keepDynamicPatterns: keepDynamic,
            minify: input.mode === 'aggressive',
        },
    );
    const pruneEnd = now();

    const sizeBefore = new TextEncoder().encode(input.css).length;
    const sizeAfter = new TextEncoder().encode(prune.css).length;

    return {
        cssFinal: prune.css,
        detectedClasses,
        removedClasses: prune.removedClasses,
        sizeBefore,
        sizeAfter,
        timings: {
            parse: Math.max(0, parseEnd - parseStart),
            scan: Math.max(0, scanEnd - scanStart),
            prune: Math.max(0, pruneEnd - pruneStart),
            total: Math.max(0, now() - totalStart),
        },
        warnings: [...safelistWarnings, ...dynamicSignal.warnings],
    };
}
