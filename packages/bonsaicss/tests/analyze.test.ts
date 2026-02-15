import fs from 'fs';
import path from 'path';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { bonsai } from '../src/index.js';

const TEST_DIR = path.resolve(__dirname, 'analyze-temp');
const HTML_FILE = path.resolve(TEST_DIR, 'index.html');
const ANALYSIS_FILE = path.resolve(TEST_DIR, 'bonsai-analysis.json');
const CUSTOM_ANALYSIS_FILE = path.resolve(TEST_DIR, 'custom-report.json');

describe('Analysis Mode', () => {
    beforeAll(() => {
        if (!fs.existsSync(TEST_DIR)) {
            fs.mkdirSync(TEST_DIR, { recursive: true });
        }
        fs.writeFileSync(
            HTML_FILE,
            '<div class="btn btn-primary"></div>\n<span class="active"></span>',
            'utf8',
        );
    });

    afterAll(() => {
        fs.rmSync(TEST_DIR, { recursive: true, force: true });
    });

    it('should generate analysis report when analyze is true', () => {
        bonsai({
            content: [HTML_FILE],
            css: '',
            analyze: true,
            cwd: TEST_DIR,
        });

        expect(fs.existsSync(ANALYSIS_FILE)).toBe(true);

        const report = JSON.parse(fs.readFileSync(ANALYSIS_FILE, 'utf8'));
        expect(report).toEqual({
            active: ['index.html:2'],
            btn: ['index.html:1'],
            'btn-primary': ['index.html:1'],
        });
    });

    it('should generate analysis report at custom path', () => {
        bonsai({
            content: [HTML_FILE],
            css: '',
            analyze: 'custom-report.json',
            cwd: TEST_DIR,
        });

        expect(fs.existsSync(CUSTOM_ANALYSIS_FILE)).toBe(true);

        const report = JSON.parse(fs.readFileSync(CUSTOM_ANALYSIS_FILE, 'utf8'));
        expect(report).toEqual({
            active: ['index.html:2'],
            btn: ['index.html:1'],
            'btn-primary': ['index.html:1'],
        });
    });
});
