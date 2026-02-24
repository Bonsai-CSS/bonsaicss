# @bonsaicss/core

> Core scanning and pruning engine for BonsaiCSS 🌳

This package powers the BonsaiCSS ecosystem with:

- AST-first CSS pruning
- content scanning and class detection
- public custom extractors API
- advanced reporting (JSON/HTML/CI)
- framework-aware patterns: React, Vue, Svelte, Angular, Astro, Solid
- server-template patterns: Blade (`@class`) and Rails ERB (`class_names`)
- persistent scan cache at `node_modules/.cache/bonsaicss`

## Installation

```bash
npm install @bonsaicss/core
```

## Quick Start

```ts
import { bonsai } from '@bonsaicss/core';

const result = bonsai({
  content: ['./src/**/*.{html,tsx,jsx,vue,svelte}'],
  css: '.btn { color: #2ecc71 } .unused { display: none }',
  minify: true,
});

console.log(result.css);
console.log(result.stats);
console.log(result.report.stats);
```

## Custom Extractors (Public API)

Use `extractors` when you need project/framework-specific extraction.

Important behavior:

- if `extractors` is provided and non-empty, Bonsai runs only custom extractors
- built-in heuristics are not used in this mode

```ts
import { bonsai, type BonsaiExtractor } from '@bonsaicss/core';

const liquidExtractor: BonsaiExtractor = {
  name: 'liquid-classes',
  test: /\.liquid$/,
  extract: /class="([^"]+)"/g,
};

const tsExtractor: BonsaiExtractor = {
  name: 'tw-call',
  test: (filePath) => filePath.endsWith('.ts') || filePath.endsWith('.tsx'),
  extract: ({ source, filePath }) => {
    const matches = Array.from(source.matchAll(/tw\("([^"]+)"\)/g));
    return {
      classes: matches.flatMap((m) =>
        (m[1] ?? '').split(/\s+/).filter(Boolean).map((name) => ({
          name,
          line: 1,
          type: 'literal',
        })),
      ),
      dynamicPatterns: [/^btn-/],
      warnings: filePath.endsWith('.legacy.ts') ? ['legacy extractor path in use'] : [],
    };
  },
};

const result = bonsai({
  content: ['./src/**/*.{liquid,ts,tsx,js,jsx}'],
  css: '.btn-primary{...}.unused{...}',
  extractors: [liquidExtractor, tsExtractor],
});
```

Extractor contracts:

- `test` (opcional): `RegExp | (filePath) => boolean`
- `extract`: `RegExp | (context) => ExtractorResult`
- input do callback: `ExtractorContext { filePath, source, cwd }`
- output: `ExtractorResult { classes?, dynamicPatterns?, warnings? }`
- `classes` supports strings or objects (`ExtractorClassMatch`) with `line` and `type`

## Reporting

`bonsai()` always returns `result.report` (`BonsaiReport`) in memory.

You can also emit files with `options.report`:

```ts
const result = bonsai({
  content: ['./src/**/*.{html,tsx}'],
  css: './dist/app.css',
  report: {
    json: true,               // bonsai-report.json
    html: './reports/bonsai.html',
    ci: './reports/bonsai-ci.txt',
  },
  analyze: true,              // legacy report: bonsai-analysis.json
});
```

`BonsaiReport` shape:

```ts
interface BonsaiReport {
  generatedAt: string;
  cwd: string;
  contentGlobs: string[];
  stats: {
    filesScanned: number;
    classesDetected: number;
    classesKept: number;
    classesRemoved: number;
    totalRules: number;
    removedRules: number;
    keptRules: number;
    sizeBefore: number;
    sizeAfter: number;
    reductionRatio: number;
    durationMs: number;
  };
  classes: {
    className: string;
    status: 'kept' | 'removed' | 'detected-only';
    origins: string[];
  }[];
  warnings: string[];
}
```

## Plugin Integration

```ts
import { createBonsaiContext } from '@bonsaicss/core';

const ctx = createBonsaiContext({
  content: ['./src/**/*.{html,tsx}'],
});

const resultA = ctx.prune('.btn{...}.unused{...}');
const resultB = ctx.prune('.card{...}.ghost{...}');

ctx.invalidate();
```

## Low-Level APIs

```ts
import {
  scanContentString,
  scanContentForClassUsage,
  pruneCss,
  collectCssClassNames,
} from '@bonsaicss/core';

const one = scanContentString('<div class="container mx-auto" />', undefined, 'inline.tsx');

const files = ['/absolute/path/src/app.tsx'];
const scan = scanContentForClassUsage(files, {
  cwd: process.cwd(),
  keepDynamicPatterns: true,
});

const pruned = pruneCss('.container{}.unused{}', scan, {
  safelist: ['always-keep'],
  minify: true,
});

const cssClasses = collectCssClassNames('.foo { color: red; } .bar { display: flex; }');
```

## Performance Cache

Built-in scanning uses:

- in-memory cache per process
- persistent cache per project at `node_modules/.cache/bonsaicss/scan-cache-v1.json`

Cache invalidation uses file signature (`mtime`, `size`) and scanner mode (`keepDynamicPatterns`).

## Benchmark

Run the core benchmark:

```bash
pnpm --filter @bonsaicss/core run benchmark
```

Optional knobs:

```bash
node packages/bonsaicss/scripts/benchmark.mjs --files 500 --classes 4000 --iterations 8
```

Output includes cold vs warm phase (persistent cache impact), plus scan/prune timing averages.

## API Reference

### Main Functions

| Function | Returns | Description |
|---|---|---|
| `bonsai(options)` | `BonsaiResult` | Full scan + prune + report build |
| `createBonsaiContext(options)` | `BonsaiContext` | Reusable context for integrations |
| `pruneCss(css, scan, options?)` | `PruneResult` | Low-level CSS pruning |
| `scanContentForClassUsage(files, options?)` | `ScanSummary` | Scan multiple files |
| `scanContentString(content, options?, label?)` | `ScanSummary-like` | Scan one source string |
| `collectCssClassNames(css)` | `Set<string>` | Extract classes from CSS selectors |
| `resolveContentFiles(globs, cwd)` | `string[]` | Resolve include/exclude globs |

### Key Types

- `BonsaiOptions`
- `PrunerOptions`
- `BonsaiExtractor`
- `BonsaiExtractorDefinition`
- `BonsaiExtractorCallback`
- `ExtractorContext`
- `ExtractorResult`
- `ScanSummary`
- `PruneResult`
- `BonsaiResult`
- `BonsaiReport`
- `BonsaiReportOptions`
- `BonsaiContext`

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `content` | `string[]` | — | Required. Content globs |
| `css` | `string \| string[]` | `''` | CSS string or CSS file paths |
| `cwd` | `string` | `process.cwd()` | Base directory |
| `safelist` | `string[]` | `[]` | Exact classes to keep |
| `safelistPatterns` | `(string \| RegExp)[]` | `[]` | Regex classes to keep |
| `keepDynamicPatterns` | `boolean \| (string \| RegExp)[]` | `false` | Infer/add dynamic prefixes |
| `extractors` | `BonsaiExtractor[]` | `undefined` | Custom extractors (exclusive mode) |
| `minify` | `boolean` | `false` | Aggressive safe minification |
| `analyze` | `boolean \| string` | `false` | Legacy JSON class-origins report |
| `report` | `BonsaiReportOptions` | `undefined` | Advanced JSON/HTML/CI reports |

## CSS Preservation

Bonsai preserves key constructs regardless of class detection:

- `@charset`, `@import`, `@namespace`
- `@font-face`, `@keyframes`, `@layer`, and related preserved at-rules
- selectors with no class references (example: `body`, `h1`, `*`)

## License

MIT
