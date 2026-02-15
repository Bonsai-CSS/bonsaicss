# @bonsaicss/esbuild-plugin

> esbuild plugin for BonsaiCSS 🌳 — prune unused CSS during esbuild builds.

## Installation

```bash
npm install @bonsaicss/esbuild-plugin esbuild
```

## Setup

### Build Script

```js
import esbuild from 'esbuild';
import bonsaiEsbuild from '@bonsaicss/esbuild-plugin';

await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  outdir: 'dist',
  plugins: [
    bonsaiEsbuild({
      content: ['./src/**/*.{html,tsx,jsx,vue,svelte}'],
    }),
  ],
});
```

### With tsup

```ts
// tsup.config.ts
import { defineConfig } from 'tsup';
import bonsaiEsbuild from '@bonsaicss/esbuild-plugin';

export default defineConfig({
  entry: ['src/index.ts'],
  esbuildPlugins: [
    bonsaiEsbuild({
      content: ['./src/**/*.{html,tsx}'],
    }),
  ],
});
```

## Options

| Option | Type | Default | Description |
|---|---|---|---|
| `content` | `string[]` | — | **Required.** Glob patterns for content files to scan. |
| `filter` | `RegExp` | `/\.css$/` | Regex filter for the `onLoad` hook. |
| `verbose` | `boolean` | `false` | Log pruning statistics to stderr. |
| `safelist` | `string[]` | `[]` | Class names to always keep. |
| `safelistPatterns` | `(string \| RegExp)[]` | `[]` | Regex patterns for classes to preserve. |
| `keepDynamicPatterns` | `boolean \| (string \| RegExp)[]` | `false` | Infer or provide dynamic class patterns. |

## How It Works

The plugin uses two esbuild hooks:

- **`onStart`** — Invalidates the scan cache at the start of each build.
- **`onLoad`** — Intercepts CSS files matching the `filter` regex, reads them from disk, prunes unused rules, and returns the optimized CSS.

## License

MIT
