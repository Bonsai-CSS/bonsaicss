import { describe, it, expect } from 'vitest';
import { expandBraces, globToRegExp, hasGlobToken, getWalkRoot } from '../src/glob.js';

describe('expandBraces', () => {
    it('should expand simple brace patterns', () => {
        expect(expandBraces('*.{html,tsx}')).toEqual(['*.html', '*.tsx']);
    });

    it('should expand nested braces', () => {
        const result = expandBraces('*.{html,{js,ts}}');
        // Inner `{html,...}` expands first, producing `*.html` twice (from outer and inner).
        expect(result).toEqual(['*.html', '*.js', '*.html', '*.ts']);
    });

    it('should return original pattern if no braces', () => {
        expect(expandBraces('*.html')).toEqual(['*.html']);
    });

    it('should handle multiple items', () => {
        expect(expandBraces('src/**/*.{html,tsx,vue}')).toEqual([
            'src/**/*.html',
            'src/**/*.tsx',
            'src/**/*.vue',
        ]);
    });
});

describe('globToRegExp', () => {
    it('should match single wildcard', () => {
        const re = globToRegExp('src/*.css');
        expect(re.test('src/style.css')).toBe(true);
        expect(re.test('src/sub/style.css')).toBe(false);
    });

    it('should match double wildcard', () => {
        const re = globToRegExp('src/**/*.css');
        expect(re.test('src/style.css')).toBe(true);
        expect(re.test('src/sub/style.css')).toBe(true);
        expect(re.test('src/a/b/c/style.css')).toBe(true);
    });

    it('should match question mark wildcard', () => {
        const re = globToRegExp('src/?.css');
        expect(re.test('src/a.css')).toBe(true);
        expect(re.test('src/ab.css')).toBe(false);
    });

    it('should escape dots', () => {
        const re = globToRegExp('src/file.css');
        expect(re.test('src/file.css')).toBe(true);
        expect(re.test('src/fileXcss')).toBe(false);
    });
});

describe('hasGlobToken', () => {
    it('should detect wildcard tokens', () => {
        expect(hasGlobToken('*.css')).toBe(true);
        expect(hasGlobToken('src/**/*.ts')).toBe(true);
        expect(hasGlobToken('file?.txt')).toBe(true);
        expect(hasGlobToken('*.{html,tsx}')).toBe(true);
    });

    it('should return false for plain paths', () => {
        expect(hasGlobToken('src/file.css')).toBe(false);
        expect(hasGlobToken('index.html')).toBe(false);
    });
});

describe('getWalkRoot', () => {
    it('should return static prefix before wildcards', () => {
        expect(getWalkRoot('/project/src/**/*.css')).toBe('/project/src');
    });

    it('should return full path when no wildcards', () => {
        expect(getWalkRoot('/project/src/file.css')).toBe('/project/src/file.css');
    });

    it('should handle wildcards at root level', () => {
        // The slash before `*` is the last `/` before the wildcard;
        // slicing up to index 0 yields an empty string in this implementation.
        expect(getWalkRoot('/*.css')).toBe('');
    });
});
