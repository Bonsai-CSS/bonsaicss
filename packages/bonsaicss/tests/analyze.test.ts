import fs from 'fs';
import path from 'path';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { bonsai } from '../src/index.js';

const TEST_DIR = path.resolve(__dirname, 'analyze-temp');
const HTML_FILE = path.resolve(TEST_DIR, 'index.html');
const ANALYSIS_FILE = path.resolve(TEST_DIR, 'bonsai-analysis.json');
const CUSTOM_ANALYSIS_FILE = path.resolve(TEST_DIR, 'custom-report.json');
const ADVANCED_REPORT_FILE = path.resolve(TEST_DIR, 'bonsai-report.json');
const CI_REPORT_FILE = path.resolve(TEST_DIR, 'bonsai-ci-stats.txt');
const HTML_REPORT_FILE = path.resolve(TEST_DIR, 'bonsai-report.html');

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

    it('should include reportVersion and extended ci fields on advanced report output', () => {
        const result = bonsai({
            content: [HTML_FILE],
            css: '.btn{color:green}.unused{display:none}',
            cwd: TEST_DIR,
            report: {
                json: true,
                ci: true,
            },
        });

        expect(result.report.reportVersion).toBe(1);
        expect(fs.existsSync(ADVANCED_REPORT_FILE)).toBe(true);
        expect(fs.existsSync(CI_REPORT_FILE)).toBe(true);

        const jsonReport = JSON.parse(fs.readFileSync(ADVANCED_REPORT_FILE, 'utf8')) as {
            reportVersion?: number;
        };
        expect(jsonReport.reportVersion).toBe(1);

        const ciReport = fs.readFileSync(CI_REPORT_FILE, 'utf8');
        expect(ciReport).toContain('report_version=1');
        expect(ciReport).toContain('size_after_kb=');
        expect(ciReport).toContain('unused_css_percent=');
    });

    it('should generate interactive html report controls', () => {
        bonsai({
            content: [HTML_FILE],
            css: '.btn{color:green}.unused{display:none}',
            cwd: TEST_DIR,
            report: {
                html: true,
            },
        });

        expect(fs.existsSync(HTML_REPORT_FILE)).toBe(true);
        const html = fs.readFileSync(HTML_REPORT_FILE, 'utf8');
        expect(html).toContain('id="class-filter"');
        expect(html).toContain('id="status-filter"');
        expect(html).toContain('<th>Why</th>');
    });
});
