import type { RunPruneInput, RunPruneResult, WorkerRequest, WorkerResponse } from '../engine/types';

export interface PruneBridge {
    runPrune(input: RunPruneInput): Promise<RunPruneResult>;
    dispose(): void;
}

export function createPruneBridge(): PruneBridge {
    const worker = new Worker(new URL('../worker/prune.worker.ts', import.meta.url), {
        type: 'module',
    });

    let nextId = 1;
    const pending = new Map<
        number,
        {
            resolve: (value: RunPruneResult) => void;
            reject: (reason?: unknown) => void;
        }
    >();

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const message = event.data;
        const target = pending.get(message.id);
        if (!target) return;

        pending.delete(message.id);

        if (message.ok) {
            target.resolve(message.payload);
            return;
        }

        target.reject(new Error(message.error));
    };

    worker.onerror = event => {
        pending.forEach(({ reject }) => {
            reject(new Error(event.message || 'Worker failed'));
        });
        pending.clear();
    };

    return {
        runPrune(input: RunPruneInput): Promise<RunPruneResult> {
            const id = nextId;
            nextId += 1;

            const request: WorkerRequest = {
                id,
                type: 'run-prune',
                payload: input,
            };

            return new Promise((resolve, reject) => {
                pending.set(id, { resolve, reject });
                worker.postMessage(request);
            });
        },

        dispose(): void {
            pending.forEach(({ reject }) => reject(new Error('Bridge disposed')));
            pending.clear();
            worker.terminate();
        },
    };
}
