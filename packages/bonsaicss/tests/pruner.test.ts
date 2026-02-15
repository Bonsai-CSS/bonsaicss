import { describe, it, expect } from 'vitest';
import * as csstree from 'css-tree';
import { pruneCss } from '../src/pruner.js';
import { scanContentString } from '../src/scanner.js';
import type { ScanSummary } from '../src/types.js';

/**
 * Helper to create a ScanSummary from a set of class names.
 */
function makeScan(classes: string[]): ScanSummary {
    return {
        classes: new Set(classes),
        dynamicPatterns: [],
        filesScanned: 1,
        classOrigins: new Map(),
    };
}

/**
 * Helper to create a ScanSummary by scanning content.
 */
function scanFromContent(content: string): ScanSummary {
    const result = scanContentString(content, undefined);
    return {
        classes: result.classes,
        dynamicPatterns: result.dynamicPatterns,
        filesScanned: 1,
        classOrigins: result.classOrigins,
    };
}

describe('pruneCss', () => {
    it('should keep used CSS rules', () => {
        const css = '.foo { color: red; } .bar { display: flex; }';
        const scan = makeScan(['foo', 'bar']);
        const result = pruneCss(css, scan);

        expect(result.css).toContain('.foo');
        expect(result.css).toContain('.bar');
        expect(result.stats.removedRules).toBe(0);
    });

    it('should remove unused CSS rules', () => {
        const css = '.foo { color: red; } .bar { display: flex; } .baz { margin: 0; }';
        const scan = makeScan(['foo']);
        const result = pruneCss(css, scan);

        expect(result.css).toContain('.foo');
        expect(result.css).not.toContain('.bar');
        expect(result.css).not.toContain('.baz');
        expect(result.stats.removedRules).toBe(2);
        expect(result.stats.keptRules).toBe(1);
    });

    it('should preserve element selectors (no class)', () => {
        const css = 'body { margin: 0; } .unused { color: red; }';
        const scan = makeScan([]);
        const result = pruneCss(css, scan);

        expect(result.css).toContain('body');
        expect(result.css).not.toContain('.unused');
    });

    it('should preserve :root with custom properties', () => {
        const css = ':root { --primary: #333; } .unused { color: red; }';
        const scan = makeScan([]);
        const result = pruneCss(css, scan);

        expect(result.css).toContain(':root');
        expect(result.css).toContain('--primary');
    });

    it('should preserve @keyframes', () => {
        const css =
            '@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } } .unused { color: red; }';
        const scan = makeScan([]);
        const result = pruneCss(css, scan);

        expect(result.css).toContain('@keyframes');
        expect(result.css).toContain('fadeIn');
    });

    it('should preserve @font-face', () => {
        const css =
            '@font-face { font-family: "Inter"; src: url("inter.woff2"); } .unused { color: red; }';
        const scan = makeScan([]);
        const result = pruneCss(css, scan);

        expect(result.css).toContain('@font-face');
    });

    it('should remove empty @media blocks after pruning', () => {
        const css = '@media (min-width: 768px) { .unused { color: red; } }';
        const scan = makeScan([]);
        const result = pruneCss(css, scan);

        expect(result.css).not.toContain('@media');
    });

    it('should keep @media blocks that still have used rules', () => {
        const css =
            '@media (min-width: 768px) { .used { color: red; } .unused { display: none; } }';
        const scan = makeScan(['used']);
        const result = pruneCss(css, scan);

        expect(result.css).toContain('@media');
        expect(result.css).toContain('.used');
        expect(result.css).not.toContain('.unused');
    });

    it('should respect safelist patterns', () => {
        const css =
            '.modal-open { overflow: hidden; } .modal-close { display: none; } .unused { color: red; }';
        const scan = makeScan([]);
        const result = pruneCss(css, scan, {
            safelistPatterns: [/^modal-/],
        });

        expect(result.css).toContain('.modal-open');
        expect(result.css).toContain('.modal-close');
        expect(result.css).not.toContain('.unused');
    });

    it('should respect exact safelist class names', () => {
        const css = '.btn { color: red; } .unused { display: none; }';
        const scan = makeScan([]);
        const result = pruneCss(css, scan, {
            safelist: ['btn'],
        });

        expect(result.css).toContain('.btn');
        expect(result.css).not.toContain('.unused');
    });

    it('should handle unparseable CSS gracefully', () => {
        const css = 'this is not valid css {{{';
        const scan = makeScan([]);
        const result = pruneCss(css, scan);

        // Should return original CSS if parsing fails
        expect(result.css).toBeTruthy();
        expect(result.stats.totalRules).toBeGreaterThanOrEqual(0);
    });

    it('should report correct statistics', () => {
        const css = '.a { color: red; } .b { color: blue; } .c { color: green; }';
        const scan = makeScan(['a']);
        const result = pruneCss(css, scan);

        expect(result.stats.totalRules).toBe(3);
        expect(result.stats.removedRules).toBe(2);
        expect(result.stats.keptRules).toBe(1);
        expect(result.stats.originalSize).toBeGreaterThan(0);
        expect(result.stats.prunedSize).toBeLessThan(result.stats.originalSize);
    });

    it('should report removed and kept class lists', () => {
        const css = '.a { x: 1; } .b { x: 2; } .c { x: 3; }';
        const scan = makeScan(['a']);
        const result = pruneCss(css, scan);

        expect(result.keptClasses).toContain('a');
        expect(result.removedClasses).toContain('b');
        expect(result.removedClasses).toContain('c');
    });

    it('should integrate with scanner output', () => {
        const html = '<div class="container mx-auto">Hello</div>';
        const scan = scanFromContent(html);

        const css =
            '.container { max-width: 1200px; } .mx-auto { margin: 0 auto; } .hidden { display: none; }';
        const result = pruneCss(css, scan);

        expect(result.css).toContain('.container');
        expect(result.css).toContain('.mx-auto');
        expect(result.css).not.toContain('.hidden');
    });

    it('should minify output when minify is true', () => {
        const css = `
            /* top comment */
            .used { color: red; }
            @media (min-width: 640px) {
                /* nested comment */
                .used { margin: 0; }
            }
        `;
        const scan = makeScan(['used']);
        const result = pruneCss(css, scan, { minify: true });

        expect(result.css).not.toContain('/*');
        expect(result.css).not.toContain('\n');
    });

    it('should keep minified output parseable and compatible', () => {
        const css = '.btn{content:"/* keep in string */";}.unused{display:none}';
        const scan = makeScan(['btn']);
        const result = pruneCss(css, scan, { minify: true });

        expect(() => csstree.parse(result.css, { parseCustomProperty: true })).not.toThrow();
        expect(result.css).toContain('/* keep in string */');
        expect(result.css).not.toContain('.unused');
    });
});
