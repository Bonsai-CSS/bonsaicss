import fs from 'fs';
import path from 'path';

import { afterEach, describe, expect, it } from 'vitest';

import { runInit } from '../src/internal/init.js';

const TEMP_ROOT = path.resolve(__dirname, 'tmp-init');

afterEach(() => {
    fs.rmSync(TEMP_ROOT, { recursive: true, force: true });
});

describe('runInit', () => {
    it('creates config file using detected framework', () => {
        const cwd = path.resolve(TEMP_ROOT, 'detected');
        fs.mkdirSync(cwd, { recursive: true });
        fs.writeFileSync(
            path.join(cwd, 'package.json'),
            JSON.stringify(
                {
                    name: 'demo',
                    dependencies: {
                        astro: '^4.0.0',
                    },
                },
                null,
                2,
            ),
            'utf8',
        );

        runInit({ cwd, force: false });

        const configPath = path.join(cwd, 'bonsai.config.ts');
        expect(fs.existsSync(configPath)).toBe(true);
        const content = fs.readFileSync(configPath, 'utf8');
        expect(content).toContain('src/**/*.{astro,html,js,ts,jsx,tsx,vue,svelte}');
    });

    it('refuses to overwrite without force', () => {
        const cwd = path.resolve(TEMP_ROOT, 'overwrite');
        fs.mkdirSync(cwd, { recursive: true });
        const configPath = path.join(cwd, 'bonsai.config.ts');
        fs.writeFileSync(configPath, 'export default {};', 'utf8');

        expect(() => runInit({ cwd, force: false })).toThrow('Config already exists');
    });
});
