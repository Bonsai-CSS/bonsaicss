<p align="center">
  <img src="https://img.shields.io/badge/🌳-BonsaiCSS-10b981?style=for-the-badge" alt="BonsaiCSS" />
</p>

<h1 align="center">BonsaiCSS</h1>

<p align="center">
  <strong>Prune unused CSS from your production builds.</strong><br />
  Scan your content files, detect which classes are actually used,<br />
  and remove everything else — like trimming a bonsai tree.
</p>

<p align="center">
Trim your CSS like a bonsai tree 🌳
</p>

<p align="center">
  <a href="#packages">Packages</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#migration-v020">Migration</a> •
  <a href="#how-it-works">How It Works</a> •
  <a href="#options">Options</a> •
  <a href="#contributing">Contributing</a>
</p>

---

## Packages

| Package | Version | Description |
|---|---|---|
| [`@bonsaicss/core`](./packages/bonsaicss) | `0.1.0` | Core scanning & pruning engine |
| [`@bonsaicss/postcss-plugin`](./packages/bonsaicss-postcss-plugin) | `0.1.0` | PostCSS integration |
| [`@bonsaicss/rollup-plugin`](./packages/bonsaicss-rollup-plugin) | `0.1.0` | Rollup / Vite integration |
| [`@bonsaicss/esbuild-plugin`](./packages/bonsaicss-esbuild-plugin) | `0.1.0` | esbuild integration |
| [`@bonsaicss/webpack-plugin`](./packages/bonsaicss-webpack-plugin) | `0.1.0` | Webpack 5 integration |
| [`@bonsaicss/cli`](./packages/bonsaicss-cli) | `0.1.0` | Command-line interface |
| [`@bonsaicss/bonsailab`](./packages/bonsailab) | `0.1.0` | Playground for pruning, inspection and benchmarks |

## Quick Start

Install the plugin for your build tool:

```bash
# PostCSS
npm install @bonsaicss/postcss-plugin

# Rollup / Vite
npm install @bonsaicss/rollup-plugin

# esbuild
npm install @bonsaicss/esbuild-plugin

# Webpack 5
npm install @bonsaicss/webpack-plugin
```

Then configure it to point at your content files:

```js
// postcss.config.js
import bonsaiPostcss from '@bonsaicss/postcss-plugin';

export default {
  plugins: [
    bonsaiPostcss({
      content: ['./src/**/*.{html,tsx,jsx,vue,svelte}'],
    }),
  ],
};
```

That's it. Unused CSS rules are stripped automatically during the build.

## Migration (v0.2.0)

- Core migration details: `packages/bonsaicss/README.md` (`Migration (v0.1.x -> v0.2.0)`).
- CLI migration details + full `bonsai.config.ts` example: `packages/bonsaicss-cli/README.md`.

## How It Works

BonsaiCSS works in three phases:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   1. Scan   │ ──► │  2. Compare  │ ──► │  3. Prune   │
│             │     │              │     │             │
│ Read content│     │ CSS classes  │     │ Remove      │
│ files and   │     │ vs. used     │     │ unreferenced│
│ extract all │     │ classes from │     │ rules from  │
│ class names │     │ content scan │     │ the CSS AST │
└─────────────┘     └─────────────┘     └─────────────┘
```

1. **Scan** — Reads HTML, JSX/TSX, Vue, Svelte, Angular, Astro and Solid templates to find every class name in use. Also detects dynamic patterns like template literals (`bg-${color}`), `classList.add()`, Blade `@class(...)`, and Rails `class_names(...)`.

2. **Compare** — Collects all class selectors from your CSS and checks them against the scanned set.

3. **Prune** — Removes unused rules from the CSS AST via [`css-tree`](https://github.com/csstree/csstree), cleans up empty `@media`/`@supports` blocks, and preserves essential constructs like `@keyframes`, `@font-face`, and `:root`.

## Options

All plugins accept the same base options from `BonsaiOptions`:

| Option | Type | Description |
|---|---|---|
| `content` | `string[]` | **Required.** Glob patterns for files to scan. |
| `css` | `string \| string[]` | CSS source (string or file paths). Plugins supply this automatically. |
| `cwd` | `string` | Working directory for resolving globs. Defaults to `process.cwd()`. |
| `safelist` | `string[]` | Class names to always keep, even if unused. |
| `safelistPatterns` | `(string \| RegExp)[]` | Regex patterns — any matching class is preserved. |
| `keepDynamicPatterns` | `boolean \| (string \| RegExp)[]` | Infer or provide explicit dynamic class patterns. |
| `minify` | `boolean` | Emit minified CSS (comment-free, compact output). |

### Safelist Examples

```js
bonsaiPostcss({
  content: ['./src/**/*.{html,tsx}'],

  // Always keep these exact classes
  safelist: ['modal-open', 'is-active'],

  // Keep any class matching these patterns
  safelistPatterns: [/^toast-/, /^animate-/],

  // Infer dynamic patterns from template literals
  keepDynamicPatterns: true,
});
```

## Supported Content Formats

BonsaiCSS scans and extracts class names from:

- **HTML** — `class="..."` attributes
- **JSX / TSX** — `className="..."` and `className={...}` expressions
- **Vue** — `:class` bindings and object/array syntax
- **Svelte** — `class:name={condition}` directives
- **Angular** — `[class.name]="condition"` bindings
- **Astro** — `class:list` bindings
- **SolidJS** — `classList={...}` object syntax
- **Server templates** — Blade `@class(...)`, ERB `class_names(...)`
- **JavaScript / TypeScript** — `classList.add()`, `classList.toggle()`, `clsx()`, `classnames()`, `cn()`

## Programmatic API

For advanced use cases, use the core package directly:

```ts
import { bonsai, pruneCss, scanContentString } from '@bonsaicss/core';

// High-level: scan + prune in one call
const result = await bonsai({
  content: ['./src/**/*.tsx'],
  css: '.btn { color: red; } .unused { display: none; }',
});

console.log(result.css);
// → '.btn { color: red; }'

// Low-level: scan content, then prune separately
const scan = scanContentString('<div class="btn">Click</div>');
const pruned = pruneCss(myCss, {
  classes: scan.classes,
  dynamicPatterns: scan.dynamicPatterns,
  filesScanned: 1,
  classOrigins: scan.classOrigins,
});
```

## CLI

Use BonsaiCSS in any project from the terminal:

```bash
pnpm cli -- \
  --content "./src/**/*.{html,tsx,jsx,vue,svelte}" \
  --css "./src/styles.css" \
  --minify \
  --out "./dist/styles.pruned.css"
```

If `--out` is not provided, pruned CSS is written to `stdout`.

## Playground

Run the local playground:

```bash
pnpm playground
```

Then open the Vite URL shown in terminal (usually `http://localhost:5173`) to use **BonsaiLab**:

- Worker-based pruning (main thread stays responsive)
- Monaco editors for content + CSS
- Safe/Aggressive mode
- Framework-aware presets (Vanilla, React, Vue, Svelte, Angular, Astro, Solid)
- CSS before/after + diff + detected/removed classes + metrics

## Benchmark

Run the core benchmark (cold vs warm cache):

```bash
npm run benchmark:core
```

## Development

This project uses **pnpm workspaces**. From the root:

```bash
# Install all dependencies
pnpm install

# Build all packages (core first, then plugins)
pnpm build

# Run tests
pnpm test

# Type-check
pnpm typecheck
```

> **Note:** Always use `pnpm` to install dependencies and run scripts in this monorepo.

## Contributing

Contributions are welcome! Please open an issue first to discuss what you'd like to change.

## License

MIT
