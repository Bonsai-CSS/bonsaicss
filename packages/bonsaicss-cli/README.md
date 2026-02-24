# @bonsaicss/cli

> Official BonsaiCSS CLI to prune unused CSS.

## Installation

```bash
npm install -D @bonsaicss/cli
```

## Quick Usage

```bash
bonsaicss \
  --content "./src/**/*.{html,tsx,jsx,vue,svelte}" \
  --css "./src/styles.css" \
  --minify \
  --out "./dist/styles.pruned.css"
```

If `--out` is not provided, pruned CSS is sent to `stdout`.

## Config File (`--config`)

You can load options from:

- `bonsai.config.json`
- `bonsai.config.js`
- `bonsai.config.cjs`
- `bonsai.config.mjs`
- `bonsai.config.ts`

If `--config` is not provided, the CLI automatically detects a `bonsai.config.*` file in `cwd`.

Note: `bonsai.config.ts` requires Node.js >= 22 in the current loader implementation.

Example `bonsai.config.ts`:

```ts
export default {
  cwd: ".",
  content: ["src/**/*.{html,tsx}"],
  css: ["src/styles.css"],
  out: "dist/styles.pruned.css",
  safelist: ["prose"],
  safelistPatterns: ["^btn-"],
  keepDynamicPatterns: true,
  extractors: [],
  minify: true,
  analyze: true,
  report: {
    json: true,
    html: "reports/bonsai.html",
    ci: "reports/bonsai-ci.txt"
  },
  verbose: true,
  stats: false,
  watch: false
};
```

`extractors` funciona em arquivos JS/TS e segue a API pública do `@bonsaicss/core` (`BonsaiExtractor`).

JSON equivalent:

```json
{
  "cwd": ".",
  "content": ["src/**/*.{html,tsx}"],
  "css": ["src/styles.css"],
  "out": "dist/styles.pruned.css",
  "safelist": ["prose"],
  "safelistPatterns": ["^btn-"],
  "keepDynamicPatterns": true,
  "minify": true,
  "analyze": true,
  "report": {
    "json": true,
    "html": "reports/bonsai.html",
    "ci": "reports/bonsai-ci.txt"
  },
  "verbose": true,
  "stats": false,
  "watch": false
}
```

Example:

`--config` accepts any of the supported extensions above.

Precedence: CLI flags override the config file.

## Options

- `--content, -c <glob>` (repeatable, required)
- `--css, -i <file.css>` (repeatable, required)
- `--config <file>`
- `--out, -o <file.css>`
- `--cwd <path>`
- `--safelist <classes>` (CSV or repeatable)
- `--safelist-pattern <regex>` (repeatable)
- `--keep-dynamic-patterns`
- `--dynamic-pattern <regex>` (repeatable)
- `--minify`
- `--analyze [file.json]`
- `--report-json [file.json]`
- `--report-html [file.html]`
- `--report-ci [file.txt]`
- `--verbose`
- `--stats` (compact JSON to `stderr`)
- `--watch`
- `--help, -h`

Note: `extractors` is configured via config file (`bonsai.config.js/ts`), not through a direct CLI flag.

## Init

Generate a starter configuration file automatically:

```bash
npx bonsaicss init
```

The `init` command detects your framework via `package.json` (`react`, `vue`, `svelte`, `angular`, `astro`, `solid`) and creates `bonsai.config.ts`.

Options:

- `--cwd <path>`
- `--config <file>`
- `--framework <react|vue|svelte|angular|astro|solid|vanilla>`
- `--force`

## Reporting

With `--report-*`, the CLI uses the core's advanced reporting.

- `--report-json` without path: `bonsai-report.json`
- `--report-html` without path: `bonsai-report.html`
- `--report-ci` without path: `bonsai-ci-stats.txt`

`--analyze` remains available as legacy report (`bonsai-analysis.json`).

## Watch Mode

In `--watch` mode, the CLI observes:

- content files resolved by globs
- CSS files provided in `--css`
- the config file passed in `--config` (if any)

On every change, pruning is re-executed.

## Verbose and Stats

- `--verbose`: readable summary with files/classes/reduction
- `--stats`: JSON payload to `stderr` for CI/pipelines

Example of `--stats`:

```json
{
  "filesScanned": 12,
  "classesDetected": 48,
  "classesRemoved": 31,
  "totalRules": 220,
  "removedRules": 140,
  "sizeBefore": 54210,
  "sizeAfter": 9132,
  "reductionRatio": 0.8315,
  "durationMs": 18.3
}
```
