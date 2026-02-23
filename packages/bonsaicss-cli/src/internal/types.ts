import type { BonsaiExtractor } from '@bonsaicss/core';

export type ReportOutput = boolean | string;

export interface ReportOptions {
    json?: ReportOutput;
    html?: ReportOutput;
    ci?: ReportOutput;
}

export interface RunReportStats {
    filesScanned: number;
    classesDetected: number;
    classesRemoved: number;
    reductionRatio: number;
    durationMs: number;
}

export interface RunReport {
    stats: RunReportStats;
    warnings: readonly string[];
}

export interface RunResult {
    css: string;
    stats: {
        totalRules: number;
        removedRules: number;
        keptRules: number;
        originalSize: number;
        prunedSize: number;
    };
    removedClasses: readonly string[];
    keptClasses: readonly string[];
    report?: RunReport;
}

export interface CliConfig {
    content?: string[];
    css?: string[];
    out?: string;
    cwd?: string;
    safelist?: string[];
    safelistPatterns?: string[];
    keepDynamicPatterns?: boolean | string[];
    extractors?: readonly BonsaiExtractor[];
    minify?: boolean;
    analyze?: boolean | string;
    report?: ReportOptions;
    verbose?: boolean;
    stats?: boolean;
    watch?: boolean;
}

export interface InitOptions {
    cwd: string;
    force: boolean;
    configPath?: string;
    framework?: string;
}

export interface ParsedArgs {
    content: string[];
    css: string[];
    out?: string;
    cwd?: string;
    safelist: string[];
    safelistPatterns: string[];
    keepDynamicPatterns?: boolean;
    dynamicPatterns: string[];
    minify?: boolean;
    analyze?: boolean | string;
    reportJson?: boolean | string;
    reportHtml?: boolean | string;
    reportCi?: boolean | string;
    verbose?: boolean;
    stats?: boolean;
    watch?: boolean;
    configPath?: string;
    help?: boolean;
}

export interface ResolvedOptions {
    configPath?: string;
    cwd: string;
    content: string[];
    css: string[];
    out?: string;
    safelist: string[];
    safelistPatterns: string[];
    keepDynamicPatterns?: boolean | string[];
    extractors?: readonly BonsaiExtractor[];
    minify: boolean;
    analyze?: boolean | string;
    report?: ReportOptions;
    verbose: boolean;
    stats: boolean;
    watch: boolean;
}
