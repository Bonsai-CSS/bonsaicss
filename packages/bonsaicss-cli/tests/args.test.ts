import { describe, expect, it } from 'vitest';

import { parseArgs, parseInitArgs } from '../src/internal/args.js';

describe('parseArgs', () => {
    it('parses ci budgets flags', () => {
        const parsed = parseArgs([
            '--content',
            'src/**/*.html',
            '--css',
            'src/styles.css',
            '--ci',
            '--max-unused-percent',
            '5',
            '--max-final-kb',
            '32',
        ]);

        expect(parsed.ci).toBe(true);
        expect(parsed.maxUnusedPercent).toBe(5);
        expect(parsed.maxFinalKb).toBe(32);
    });

    it('throws for invalid numeric ci budget', () => {
        expect(() =>
            parseArgs([
                '--content',
                'src/**/*.html',
                '--css',
                'src/styles.css',
                '--max-final-kb',
                'abc',
            ]),
        ).toThrow('Invalid number for --max-final-kb');
    });
});

describe('parseInitArgs', () => {
    it('parses init options', () => {
        const parsed = parseInitArgs([
            '--cwd',
            './demo',
            '--framework',
            'astro',
            '--config',
            'bonsai.config.ts',
            '--force',
        ]);

        expect(parsed.framework).toBe('astro');
        expect(parsed.configPath).toBe('bonsai.config.ts');
        expect(parsed.force).toBe(true);
    });
});
