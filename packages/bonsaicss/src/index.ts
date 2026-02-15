/**
 * @module @bonsaicss/core
 *
 * BonsaiCSS — An AST-first CSS pruner 🌳
 *
 * Prune unused CSS by scanning content files for class usage
 * and removing unreferenced selectors from your stylesheets.
 */
export type {
    BonsaiExtractor,
    ExtractorContext,
    ExtractorResult,
    ExtractorClassMatch,
    PrunerOptions,
    BonsaiOptions,
    BonsaiResult,
    BonsaiReport,
    BonsaiReportStats,
    BonsaiReportClassEntry,
    BonsaiReportOptions,
    ScanSummary,
    PruneResult,
    PruneStats,
    BonsaiContext,
} from './types.js';

export { bonsai, createBonsaiContext } from './bonsai.js';

export { pruneCss } from './pruner.js';

export {
    scanContentForClassUsage,
    scanContentString,
    collectCssClassNames,
    parseSafelistPatterns,
} from './scanner.js';

export { resolveContentFiles } from './glob.js';

export {
    escapeRegex,
    normalizeSlashes,
    tokenizeClassList,
    createLineResolver,
    splitArguments,
    parsePatternEntries,
    dedupeRegex,
} from './utils.js';
