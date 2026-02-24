import fs from 'fs';

import { writeError, writeInfo } from './output.js';
import { collectWatchFiles, runOnce } from './runner.js';
import type { ResolvedOptions } from './types.js';

function createWatcher(file: string, onChange: () => void): fs.FSWatcher | null {
    try {
        return fs.watch(file, { persistent: true }, () => {
            onChange();
        });
    } catch {
        return null;
    }
}

export function runWithWatch(resolveOptions: () => ResolvedOptions): void {
    let options = resolveOptions();
    let watchers: fs.FSWatcher[] = [];
    let rerunTimer: NodeJS.Timeout | null = null;

    const closeWatchers = (): void => {
        watchers.forEach(watcher => watcher.close());
        watchers = [];
    };

    const refreshWatchers = (): void => {
        closeWatchers();
        const files = collectWatchFiles(options);
        files.forEach(file => {
            const watcher = createWatcher(file, () => {
                if (rerunTimer) clearTimeout(rerunTimer);
                rerunTimer = setTimeout(() => {
                    try {
                        options = resolveOptions();
                        runOnce(options);
                        refreshWatchers();
                    } catch (err) {
                        const message = err instanceof Error ? err.message : String(err);
                        writeError(message);
                    }
                }, 120);
            });
            if (watcher) watchers.push(watcher);
        });
    };

    try {
        runOnce(options);
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        writeError(`initial run failed: ${message}`);
    }
    refreshWatchers();
    writeInfo('watch mode active');
}
