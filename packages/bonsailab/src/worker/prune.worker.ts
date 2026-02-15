/// <reference lib="webworker" />

import type { WorkerRequest, WorkerResponse } from '../engine/types';
import { runPrune } from './runPrune';

function isWorkerRequest(value: unknown): value is WorkerRequest {
    if (!value || typeof value !== 'object') return false;

    const maybe = value as Partial<WorkerRequest>;
    return (
        typeof maybe.id === 'number' &&
        maybe.type === 'run-prune' &&
        !!maybe.payload &&
        typeof maybe.payload === 'object'
    );
}

self.onmessage = (event: MessageEvent<unknown>) => {
    const request = event.data;
    if (!isWorkerRequest(request)) return;

    let response: WorkerResponse;

    try {
        response = {
            id: request.id,
            ok: true,
            payload: runPrune(request.payload),
        };
    } catch (error) {
        response = {
            id: request.id,
            ok: false,
            error: error instanceof Error ? error.message : 'Unexpected worker error',
        };
    }

    self.postMessage(response);
};
