import fs from 'fs';
import path from 'path';

import { afterEach, describe, expect, it } from 'vitest';

import {
    findDefaultConfigPath,
    loadConfig,
    mergeConfigWithArgs,
    validateResolvedOptions,
} from '../src/internal/config.js';
import type { ParsedArgs } from '../src/internal/types.js';

const TEMP_ROOT = path.resolve(__dirname, 'tmp-config');

function baseArgs(): ParsedArgs {
    return {
        content: ['src/**/*.html'],
        css: ['src/styles.css'],
        safelist: [],
        safelistPatterns: [],
        dynamicPatterns: [],
    };
}

afterEach(() => {
    fs.rmSync(TEMP_ROOT, { recursive: true, force: true });
});

describe('config loader', () => {
    it('finds default config path by priority', () => {
        const cwd = path.resolve(TEMP_ROOT, 'priority');
        fs.mkdirSync(cwd, { recursive: true });
        fs.writeFileSync(path.join(cwd, 'bonsai.config.js'), 'export default {};', 'utf8');
        fs.writeFileSync(path.join(cwd, 'bonsai.config.ts'), 'export default {};', 'utf8');

        const found = findDefaultConfigPath(cwd);
        expect(found).toBe(path.join(cwd, 'bonsai.config.ts'));
    });

    it('loads json config file', () => {
        const cwd = path.resolve(TEMP_ROOT, 'json');
        fs.mkdirSync(cwd, { recursive: true });
        const configPath = path.join(cwd, 'bonsai.config.json');
        fs.writeFileSync(
            configPath,
            JSON.stringify(
                {
                    content: ['a'],
                    css: ['b'],
                    minify: true,
                },
                null,
                2,
            ),
            'utf8',
        );

        const loaded = loadConfig(configPath, cwd);
        expect(loaded.minify).toBe(true);
        expect(loaded.content).toEqual(['a']);
    });

    it('loads js config function export', () => {
        const cwd = path.resolve(TEMP_ROOT, 'js-fn');
        fs.mkdirSync(cwd, { recursive: true });
        const configPath = path.join(cwd, 'bonsai.config.mjs');
        fs.writeFileSync(
            configPath,
            `export default () => ({ content: ['x'], css: ['y'], minify: true });`,
            'utf8',
        );

        const loaded = loadConfig(configPath, cwd);
        expect(loaded.minify).toBe(true);
        expect(loaded.content).toEqual(['x']);
        expect(loaded.css).toEqual(['y']);
    });
});

describe('merge + validate', () => {
    it('merges ci options from args and validates ranges', () => {
        const merged = mergeConfigWithArgs(
            {
                ci: { enabled: true, maxUnusedPercent: 10 },
            },
            {
                ...baseArgs(),
                maxFinalKb: 24,
            },
        );

        expect(merged.ci?.enabled).toBe(true);
        expect(merged.ci?.maxUnusedPercent).toBe(10);
        expect(merged.ci?.maxFinalKb).toBe(24);
        expect(() => validateResolvedOptions(merged)).not.toThrow();
    });

    it('fails when ci mode is enabled with no budget', () => {
        const merged = mergeConfigWithArgs(
            {
                ci: { enabled: true },
            },
            baseArgs(),
        );

        expect(() => validateResolvedOptions(merged)).toThrow(
            'CI mode requires at least one budget',
        );
    });

    it('fails when maxUnusedPercent is out of range', () => {
        const merged = mergeConfigWithArgs(
            {},
            {
                ...baseArgs(),
                maxUnusedPercent: 120,
            },
        );
        expect(() => validateResolvedOptions(merged)).toThrow(
            '--max-unused-percent must be between 0 and 100.',
        );
    });
});
