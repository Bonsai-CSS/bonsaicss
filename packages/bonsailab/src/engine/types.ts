export type PruneMode = 'safe' | 'aggressive';
export type Framework = 'vanilla' | 'react' | 'vue' | 'svelte' | 'angular';

export type DetectionType = 'literal' | 'template' | 'object' | 'dynamic';

export interface DetectedClass {
    name: string;
    file: string;
    line: number;
    type: DetectionType;
}

export interface RunPruneInput {
    files: Record<string, string>;
    css: string;
    mode: PruneMode;
    framework: Framework;
    safelist: string[];
    keepDynamicPatterns?: boolean;
}

export interface RunPruneResult {
    cssFinal: string;
    readonly detectedClasses: readonly DetectedClass[];
    readonly removedClasses: readonly string[];
    sizeBefore: number;
    sizeAfter: number;
    timings: {
        parse: number;
        scan: number;
        prune: number;
        total: number;
    };
    readonly warnings: readonly string[];
}

export interface WorkerRequest {
    id: number;
    type: 'run-prune';
    payload: RunPruneInput;
}

export interface WorkerSuccessResponse {
    id: number;
    ok: true;
    payload: RunPruneResult;
}

export interface WorkerErrorResponse {
    id: number;
    ok: false;
    error: string;
}

export type WorkerResponse = WorkerSuccessResponse | WorkerErrorResponse;
