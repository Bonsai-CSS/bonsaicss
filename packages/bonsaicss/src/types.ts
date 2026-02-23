/** A class match returned by an extractor. */
export interface ExtractorClassMatch {
    readonly name: string;
    readonly line?: number;

    /**
     * Optional semantic kind from the extractor implementation.
     * Suggested values: `literal`, `template`, `object`, `dynamic`.
     */
    readonly type?: string;
}

/** Input passed to a custom extractor. */
export interface ExtractorContext {
    readonly filePath: string;
    readonly source: string;
    readonly cwd: string;
}

/** Output returned by a custom extractor. */
export interface ExtractorResult {
    readonly classes?: ReadonlyArray<string | ExtractorClassMatch>;
    readonly dynamicPatterns?: ReadonlyArray<string | RegExp>;
    readonly warnings?: readonly string[];
}

/** Public custom extractor callback API. */
export type BonsaiExtractorCallback = (
    context: ExtractorContext,
) => ExtractorResult | null | undefined;

/** Controls which files an extractor should run for. */
export type ExtractorFileMatcher = RegExp | ((filePath: string) => boolean);

/** Public extractor definition API. */
export interface BonsaiExtractorDefinition {
    /** Optional label used in warnings/debugging. */
    readonly name?: string;

    /** Optional file matcher (path is normalized with `/`). */
    readonly test?: ExtractorFileMatcher;

    /**
     * Extraction strategy:
     * - callback for full control
     * - regex for quick string capture extraction
     */
    readonly extract: RegExp | BonsaiExtractorCallback;
}

/** Public custom extractor API. */
export type BonsaiExtractor = BonsaiExtractorCallback | BonsaiExtractorDefinition;

/**
 * Options controlling the pruning behavior.
 */
export interface PrunerOptions {
    readonly safelist?: readonly string[];
    readonly safelistPatterns?: ReadonlyArray<string | RegExp>;

    /**
     * When `true`, BonsaiCSS infers dynamic class patterns from template
     * literals and string concatenation (e.g. `bg-${color}` → keeps `bg-*`).
     *
     * Provide an array of string/RegExp to add explicit dynamic patterns.
     */
    readonly keepDynamicPatterns?: boolean | ReadonlyArray<string | RegExp>;

    /**
     * When `true`, emits minified CSS output.
     *
     * Minification is parser-based (css-tree), removes comments and
     * generates compact output with compatibility-safe serialization.
     */
    readonly minify?: boolean;

    /**
     * Custom extractors used by the scanner.
     *
     * - When provided and non-empty, only these extractors run.
     * - When omitted, BonsaiCSS uses built-in extractor heuristics.
     */
    readonly extractors?: readonly BonsaiExtractor[];
}

/**
 * Top-level configuration for BonsaiCSS.
 */
export interface BonsaiOptions extends PrunerOptions {
    /** Glob patterns for content files to scan (e.g. `"./src/**\/*.{html,tsx}"`). */
    readonly content: readonly string[];

    /**
     * CSS source to prune. Provide either a raw string or file paths.
     * When omitted, plugins supply CSS from their own pipeline.
     */
    readonly css?: string | readonly string[];

    /** Working directory for resolving globs. Defaults to `process.cwd()`. */
    readonly cwd?: string;

    /**
     * Generate a JSON report of class usage (class -> source locations).
     * - `true`: write to `bonsai-analysis.json` in `cwd`.
     * - `string`: write to specified path (relative to `cwd` or absolute).
     */
    readonly analyze?: boolean | string;

    /**
     * Advanced report emitters for JSON/HTML/CI pipelines.
     * These reports are emitted in addition to `analyze`.
     */
    readonly report?: BonsaiReportOptions;
}

/**
 * Result of scanning content files for class usage.
 */
export interface ScanSummary {
    /** All unique class names found across scanned files. */
    readonly classes: Set<string>;

    /** Regex patterns derived from dynamic class constructions. */
    readonly dynamicPatterns: readonly RegExp[];

    /** Number of content files scanned. */
    readonly filesScanned: number;

    /** Maps each class name → set of `"file:line"` origins. */
    readonly classOrigins: ReadonlyMap<string, ReadonlySet<string>>;

    /** Non-fatal scanner warnings (extractor errors, invalid patterns, etc.). */
    readonly warnings?: readonly string[];
}

export interface BonsaiReportStats {
    readonly filesScanned: number;
    readonly classesDetected: number;
    readonly classesKept: number;
    readonly classesRemoved: number;
    readonly totalRules: number;
    readonly removedRules: number;
    readonly keptRules: number;
    readonly sizeBefore: number;
    readonly sizeAfter: number;
    readonly reductionRatio: number;
    readonly durationMs: number;
}

export interface BonsaiReportClassEntry {
    readonly className: string;
    readonly status: 'kept' | 'removed' | 'detected-only';
    readonly origins: readonly string[];
}

export interface BonsaiReport {
    readonly generatedAt: string;
    readonly cwd: string;
    readonly contentGlobs: readonly string[];
    readonly stats: BonsaiReportStats;
    readonly classes: readonly BonsaiReportClassEntry[];
    readonly warnings: readonly string[];
}

export interface BonsaiReportOptions {
    /** Emit full JSON report. */
    readonly json?: boolean | string;

    /** Emit HTML report dashboard. */
    readonly html?: boolean | string;

    /** Emit compact CI stats file. */
    readonly ci?: boolean | string;
}

/**
 * Statistics about a single prune operation.
 */
export interface PruneStats {
    /** Total CSS selectors/rules before pruning. */
    readonly totalRules: number;

    /** Rules removed by pruning. */
    readonly removedRules: number;

    /** Rules kept after pruning. */
    readonly keptRules: number;

    /** Original CSS size in bytes. */
    readonly originalSize: number;

    /** Pruned CSS size in bytes. */
    readonly prunedSize: number;
}

/**
 * Result of a CSS prune operation.
 */
export interface PruneResult {
    /** The pruned CSS string. */
    readonly css: string;

    /** Statistics about the prune operation. */
    readonly stats: PruneStats;

    /** Names of classes that were removed. */
    readonly removedClasses: readonly string[];

    /** Names of classes that were kept. */
    readonly keptClasses: readonly string[];
}

export interface BonsaiResult extends PruneResult {
    /** Structured report attached to every run. */
    readonly report: BonsaiReport;
}

/**
 * Reusable context for plugin integrations.
 * Created once, used across multiple CSS files.
 */
export interface BonsaiContext {
    /** The resolved scan summary (lazily computed on first access). */
    readonly scan: ScanSummary;

    /** Prune a CSS string using the scanned context. */
    readonly prune: (css: string) => BonsaiResult;

    /** Re-scan content files (e.g. after HMR updates). */
    readonly invalidate: () => void;
}
