import fs from 'fs';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';

import { resolvePersistentScanCachePath } from '../src/scan-cache.js';
import { scanContentForClassUsage } from '../src/scanner.js';

const TEMP_ROOT = path.resolve(__dirname, 'cache-temp');

afterEach(() => {
    fs.rmSync(TEMP_ROOT, { recursive: true, force: true });
});

describe('persistent scan cache', () => {
    it('writes cache entries under node_modules/.cache/bonsaicss', () => {
        const cwd = path.resolve(TEMP_ROOT, 'project-a');
        const contentFile = path.resolve(cwd, 'src/app.html');
        fs.mkdirSync(path.dirname(contentFile), { recursive: true });
        fs.writeFileSync(contentFile, '<div class="btn card"></div>', 'utf8');

        const scan = scanContentForClassUsage([contentFile], { cwd });
        expect(scan.classes.has('btn')).toBe(true);
        expect(scan.classes.has('card')).toBe(true);

        const cachePath = resolvePersistentScanCachePath(cwd);
        expect(fs.existsSync(cachePath)).toBe(true);
        const payload = JSON.parse(fs.readFileSync(cachePath, 'utf8')) as {
            version?: number;
            entries?: Record<string, { classes?: string[] }>;
        };
        expect(payload.version).toBe(1);
        const entry = payload.entries?.[path.resolve(contentFile)];
        expect(entry?.classes?.includes('btn')).toBe(true);
        expect(entry?.classes?.includes('card')).toBe(true);
    });

    it('invalidates cache entries when source file changes', () => {
        const cwd = path.resolve(TEMP_ROOT, 'project-b');
        const contentFile = path.resolve(cwd, 'src/view.html');
        fs.mkdirSync(path.dirname(contentFile), { recursive: true });
        fs.writeFileSync(contentFile, '<div class="btn"></div>', 'utf8');

        const first = scanContentForClassUsage([contentFile], { cwd });
        expect(first.classes.has('btn')).toBe(true);
        expect(first.classes.has('chip')).toBe(false);

        fs.writeFileSync(contentFile, '<div class="chip"></div>', 'utf8');
        const second = scanContentForClassUsage([contentFile], { cwd });
        expect(second.classes.has('btn')).toBe(false);
        expect(second.classes.has('chip')).toBe(true);
    });
});
