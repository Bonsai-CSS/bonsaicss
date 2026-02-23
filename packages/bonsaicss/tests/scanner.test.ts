import { describe, it, expect } from 'vitest';
import { scanContentString, collectCssClassNames, parseSafelistPatterns } from '../src/scanner.js';
import type { BonsaiExtractor } from '../src/types.js';

describe('scanContentString', () => {
    it('should extract classes from static HTML class attributes', () => {
        const html = '<div class="foo bar baz">Hello</div>';
        const result = scanContentString(html, undefined);
        expect(result.classes).toEqual(new Set(['foo', 'bar', 'baz']));
    });

    it('should extract classes from React className', () => {
        const jsx = '<div className="container mx-auto">Content</div>';
        const result = scanContentString(jsx, undefined);
        expect(result.classes).toEqual(new Set(['container', 'mx-auto']));
    });

    it('should extract classes from Svelte class: directive', () => {
        const svelte = '<div class:active={isActive} class:hidden={!show}>X</div>';
        const result = scanContentString(svelte, undefined);
        expect(result.classes).toEqual(new Set(['active', 'hidden']));
    });

    it('should extract classes from Angular [class.x] binding', () => {
        const ng = '<div [class.active]="isActive" [class.hidden]="!show">X</div>';
        const result = scanContentString(ng, undefined);
        expect(result.classes).toEqual(new Set(['active', 'hidden']));
    });

    it('should extract classes from classList.add()', () => {
        const js = "element.classList.add('foo', 'bar');";
        const result = scanContentString(js, undefined);
        expect(result.classes).toEqual(new Set(['foo', 'bar']));
    });

    it('should extract classes from classList.replace()', () => {
        const js = "element.classList.replace('old-style', 'new-style');";
        const result = scanContentString(js, undefined);
        expect(result.classes).toEqual(new Set(['old-style', 'new-style']));
    });

    it('should extract classes from clsx()', () => {
        const js = "clsx('base', isActive && 'active', { hidden: isHidden })";
        const result = scanContentString(js, undefined);
        expect(result.classes).toEqual(new Set(['base', 'active', 'hidden']));
    });

    it('should extract classes from className dynamic expression', () => {
        const jsx = `className={"bg-red-500"}`;
        const result = scanContentString(jsx, undefined);
        expect(result.classes.has('bg-red-500')).toBe(true);
    });

    it('should extract classes from Vue :class binding', () => {
        const vue = `:class="{ active: isActive, 'text-bold': isBold }"`;
        const result = scanContentString(vue, undefined);
        expect(result.classes.has('active')).toBe(true);
        expect(result.classes.has('text-bold')).toBe(true);
    });

    it('should track class origins when sourceLabel is provided', () => {
        const html = '<div class="foo">Hi</div>';
        const result = scanContentString(html, undefined, 'src/app.html');
        expect(result.classOrigins.has('foo')).toBe(true);
        const origins = result.classOrigins.get('foo')!;
        expect(origins.size).toBeGreaterThan(0);
        const originStr = Array.from(origins)[0]!;
        expect(originStr).toMatch(/^src\/app\.html:\d+$/);
    });

    it('should resolve const variable references', () => {
        const js = `
            const baseClass = 'container';
            element.classList.add(baseClass);
        `;
        const result = scanContentString(js, undefined);
        expect(result.classes.has('container')).toBe(true);
    });

    it('should return empty set for content with no classes', () => {
        const text = 'Hello, world!';
        const result = scanContentString(text, undefined);
        expect(result.classes.size).toBe(0);
    });

    it('should use custom extractors when provided', () => {
        const extractor: BonsaiExtractor = () => ({
            classes: [{ name: 'from-extractor', line: 3 }],
        });
        const result = scanContentString(
            '<div class="ignored">x</div>',
            { extractors: [extractor] },
            'app.tsx',
        );

        expect(result.classes.has('from-extractor')).toBe(true);
        expect(result.classes.has('ignored')).toBe(false);
        expect(result.classOrigins.get('from-extractor')).toEqual(new Set(['app.tsx:3']));
    });

    it('should collect dynamic patterns from custom extractors', () => {
        const extractor: BonsaiExtractor = () => ({
            classes: ['btn'],
            dynamicPatterns: ['^btn-'],
        });
        const result = scanContentString('unused', { extractors: [extractor] });

        expect(result.classes.has('btn')).toBe(true);
        expect(result.dynamicPatterns.some(pattern => pattern.test('btn-primary'))).toBe(true);
    });

    it('should expose extractor warnings and recover from extractor errors', () => {
        const broken: BonsaiExtractor = () => {
            throw new Error('extractor boom');
        };
        const noisy: BonsaiExtractor = () => ({
            classes: ['ok'],
            warnings: ['custom warning'],
        });

        const result = scanContentString('x', { extractors: [broken, noisy] });
        expect(result.classes.has('ok')).toBe(true);
        expect(result.warnings.some(warning => warning.includes('extractor boom'))).toBe(true);
        expect(result.warnings.some(w => w.includes('custom warning'))).toBe(true);
    });
});

describe('collectCssClassNames', () => {
    it('should extract class names from CSS selectors', () => {
        const css = '.foo { color: red; } .bar { display: flex; }';
        const result = collectCssClassNames(css);
        expect(result).toEqual(new Set(['foo', 'bar']));
    });

    it('should handle escaped characters', () => {
        const css = '.sm\\:grid { display: grid; }';
        const result = collectCssClassNames(css);
        expect(result).toEqual(new Set(['sm:grid']));
    });

    it('should handle complex selectors', () => {
        const css = '.container .nav-item:hover { color: blue; }';
        const result = collectCssClassNames(css);
        expect(result.has('container')).toBe(true);
        expect(result.has('nav-item')).toBe(true);
    });

    it('should not treat decimal values as class names', () => {
        const css = '.a { box-shadow: 0 8px 32px rgba(0,0,0,0.4); }';
        const result = collectCssClassNames(css);
        expect(result.has('a')).toBe(true);
        expect(result.has('4')).toBe(false);
    });

    it('should return empty set for element-only selectors', () => {
        const css = 'body { margin: 0; } h1 { font-size: 2rem; }';
        const result = collectCssClassNames(css);
        expect(result.size).toBe(0);
    });
});

describe('parseSafelistPatterns', () => {
    it('should parse string patterns', () => {
        const result = parseSafelistPatterns(['^modal-']);
        expect(result).toHaveLength(1);
        expect(result[0]!.test('modal-open')).toBe(true);
    });

    it('should parse RegExp instances', () => {
        const result = parseSafelistPatterns([/^tooltip/]);
        expect(result).toHaveLength(1);
        expect(result[0]!.test('tooltip-top')).toBe(true);
    });

    it('should return empty for undefined', () => {
        expect(parseSafelistPatterns(undefined)).toEqual([]);
    });
});
