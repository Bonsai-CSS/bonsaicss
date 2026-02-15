import { describe, it, expect } from 'vitest';
import {
    escapeRegex,
    normalizeSlashes,
    tokenizeClassList,
    splitArguments,
    parsePatternEntries,
    dedupeRegex,
} from '../src/utils.js';

describe('escapeRegex', () => {
    it('should escape special regex characters', () => {
        expect(escapeRegex('foo.bar')).toBe('foo\\.bar');
        expect(escapeRegex('a*b+c?')).toBe('a\\*b\\+c\\?');
        expect(escapeRegex('(a|b)')).toBe('\\(a\\|b\\)');
        expect(escapeRegex('[a-z]')).toBe('\\[a-z\\]');
    });

    it('should return plain strings unchanged', () => {
        expect(escapeRegex('hello')).toBe('hello');
        expect(escapeRegex('')).toBe('');
    });
});

describe('normalizeSlashes', () => {
    it('should convert backslashes to forward slashes', () => {
        expect(normalizeSlashes('foo\\bar\\baz')).toBe('foo/bar/baz');
    });

    it('should leave forward slashes unchanged', () => {
        expect(normalizeSlashes('foo/bar/baz')).toBe('foo/bar/baz');
    });
});

describe('tokenizeClassList', () => {
    it('should split a class list by whitespace', () => {
        expect(tokenizeClassList('foo bar baz')).toEqual(['foo', 'bar', 'baz']);
    });

    it('should split a class list by commas', () => {
        expect(tokenizeClassList('foo, bar, baz')).toEqual(['foo', 'bar', 'baz']);
    });

    it('should strip surrounding quotes', () => {
        expect(tokenizeClassList('\'foo\' "bar"')).toEqual(['foo', 'bar']);
    });

    it('should filter URLs', () => {
        expect(tokenizeClassList('foo https://example.com bar')).toEqual(['foo', 'bar']);
    });

    it('should filter code artifacts', () => {
        expect(tokenizeClassList('foo <div> bar {baz} qux')).toEqual(['foo', 'bar', 'qux']);
    });

    it('should filter invalid identifiers', () => {
        // `.bar` is filtered — starts with a dot which is invalid per the regex.
        // `123invalid` starts with a digit, which is valid per [a-zA-Z0-9_-] start.
        expect(tokenizeClassList('foo .bar 123invalid')).toEqual(['foo', '123invalid']);
    });

    it('should handle Tailwind-style classes', () => {
        expect(tokenizeClassList('bg-red-500 text-lg sm:grid')).toEqual([
            'bg-red-500',
            'text-lg',
            'sm:grid',
        ]);
    });

    it('should return empty array for empty string', () => {
        expect(tokenizeClassList('')).toEqual([]);
    });
});

describe('splitArguments', () => {
    it('should split simple comma-separated arguments', () => {
        expect(splitArguments("'foo', 'bar', 'baz'")).toEqual(["'foo'", "'bar'", "'baz'"]);
    });

    it('should respect nested parentheses', () => {
        const result = splitArguments("fn(a, b), 'x'");
        expect(result).toEqual(['fn(a, b)', "'x'"]);
    });

    it('should respect quoted strings', () => {
        const result = splitArguments("'a, b', 'c'");
        expect(result).toEqual(["'a, b'", "'c'"]);
    });

    it('should handle empty input', () => {
        expect(splitArguments('')).toEqual([]);
    });
});

describe('parsePatternEntries', () => {
    it('should parse regex strings', () => {
        const result = parsePatternEntries(['^bg-']);
        expect(result).toHaveLength(1);
        expect(result[0]!.test('bg-red')).toBe(true);
        expect(result[0]!.test('text-red')).toBe(false);
    });

    it('should parse RegExp instances', () => {
        const result = parsePatternEntries([/^text-/]);
        expect(result).toHaveLength(1);
        expect(result[0]!.test('text-lg')).toBe(true);
    });

    it('should parse /regex/flags format', () => {
        const result = parsePatternEntries(['/^bg-/i']);
        expect(result).toHaveLength(1);
        expect(result[0]!.test('BG-red')).toBe(true);
    });

    it('should skip invalid regex', () => {
        const result = parsePatternEntries(['[invalid']);
        expect(result).toHaveLength(0);
    });

    it('should return empty for undefined', () => {
        expect(parsePatternEntries(undefined)).toEqual([]);
        expect(parsePatternEntries([])).toEqual([]);
    });
});

describe('dedupeRegex', () => {
    it('should remove duplicate regex patterns', () => {
        const input = [/^bg-/, /^text-/, /^bg-/, /^text-/i];
        const result = dedupeRegex(input);
        expect(result).toHaveLength(3);
    });

    it('should return empty for empty input', () => {
        expect(dedupeRegex([])).toEqual([]);
    });
});
