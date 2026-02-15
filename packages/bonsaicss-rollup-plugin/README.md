# @bonsaicss/rollup-plugin

> Rollup / Vite plugin for BonsaiCSS 🌳 — prune unused CSS during Rollup builds.

## Installation

```bash
npm install @bonsaicss/rollup-plugin rollup
```

## Setup

### rollup.config.js

```js
import bonsaiRollup from '@bonsaicss/rollup-plugin';

export default {
  input: 'src/index.js',
  plugins: [
    bonsaiRollup({
      content: ['./src/**/*.{html,tsx,jsx,vue,svelte}'],
    }),
  ],
};
```

### With Vite

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import bonsaiRollup from '@bonsaicss/rollup-plugin';

export default defineConfig({
  plugins: [
    bonsaiRollup({
      content: ['./src/**/*.{html,tsx,jsx,vue,svelte}'],
    }),
  ],
});
```

## Options

| Option | Type | Default | Description |
|---|---|---|---|
| `content` | `string[]` | — | **Required.** Glob patterns for content files to scan. |
| `extensions` | `string[]` | `['.css']` | File extensions to process. |
| `verbose` | `boolean` | `false` | Log pruning statistics to stderr. |
| `safelist` | `string[]` | `[]` | Class names to always keep. |
| `safelistPatterns` | `(string \| RegExp)[]` | `[]` | Regex patterns for classes to preserve. |
| `keepDynamicPatterns` | `boolean \| (string \| RegExp)[]` | `false` | Infer or provide dynamic class patterns. |

## How It Works

The plugin uses two Rollup hooks:

- **`buildStart`** — Invalidates the scan cache at the start of each build for fresh scanning.
- **`transform`** — Intercepts CSS files (by extension), prunes them against scanned content, and returns the optimized CSS.

The scan is lazily initialized on the first CSS file and shared across all CSS files in the build.

## License

MIT
