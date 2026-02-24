import fs from 'fs';
import path from 'path';

import { afterEach, describe, expect, it } from 'vitest';

import { collectWatchFiles } from '../src/internal/runner.js';
import type { ResolvedOptions } from '../src/internal/types.js';

const TEMP_ROOT = path.resolve(__dirname, 'tmp-runner');

afterEach(() => {
    fs.rmSync(TEMP_ROOT, { recursive: true, force: true });
});

function makeOptions(overrides: Partial<ResolvedOptions> = {}): ResolvedOptions {
    const cwd = path.resolve(TEMP_ROOT, 'project');
    return {
        cwd,
        content: ['src/**/*.html'],
        css: ['src/styles.css'],
        safelist: [],
        safelistPatterns: [],
        minify: false,
        verbose: false,
        stats: false,
        watch: true,
        ...overrides,
    };
}

describe('collectWatchFiles', () => {
    it('includes absolute configPath unchanged', () => {
        const cwd = path.resolve(TEMP_ROOT, 'project');
        const srcDir = path.join(cwd, 'src');
        fs.mkdirSync(srcDir, { recursive: true });
        fs.writeFileSync(path.join(srcDir, 'index.html'), '<div class="a"></div>', 'utf8');
        fs.writeFileSync(path.join(srcDir, 'styles.css'), '.a{}', 'utf8');
        const configPath = path.join(cwd, 'bonsai.config.ts');
        fs.writeFileSync(configPath, 'export default {};', 'utf8');

        const files = collectWatchFiles(
            makeOptions({
                cwd,
                configPath,
            }),
        );

        expect(files).toContain(configPath);
    });
});
