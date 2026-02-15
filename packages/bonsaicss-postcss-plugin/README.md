# @bonsaicss/postcss-plugin

> PostCSS plugin for BonsaiCSS 🌳 — prune unused CSS during PostCSS processing.

## Installation

```bash
npm install @bonsaicss/postcss-plugin postcss
```

## Setup

### postcss.config.js

```js
import bonsaiPostcss from '@bonsaicss/postcss-plugin';

export default {
  plugins: [
    bonsaiPostcss({
      content: ['./src/**/*.{html,tsx,jsx,vue,svelte}'],
    }),
  ],
};
```

### With Vite

```js
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  css: {
    postcss: {
      plugins: [
        (await import('@bonsaicss/postcss-plugin')).default({
          content: ['./src/**/*.{html,tsx,jsx,vue,svelte}'],
        }),
      ],
    },
  },
});
```

### With Next.js

```js
// postcss.config.mjs
import bonsaiPostcss from '@bonsaicss/postcss-plugin';

export default {
  plugins: [
    bonsaiPostcss({
      content: [
        './app/**/*.{tsx,jsx}',
        './components/**/*.{tsx,jsx}',
      ],
    }),
  ],
};
```

## Options

| Option | Type | Default | Description |
|---|---|---|---|
| `content` | `string[]` | — | **Required.** Glob patterns for content files to scan. |
| `verbose` | `boolean` | `false` | Log pruning statistics to stderr. |
| `safelist` | `string[]` | `[]` | Class names to always keep. |
| `safelistPatterns` | `(string \| RegExp)[]` | `[]` | Regex patterns for classes to preserve. |
| `keepDynamicPatterns` | `boolean \| (string \| RegExp)[]` | `false` | Infer or provide dynamic class patterns. |

## Verbose Output

Enable verbose mode to see pruning statistics:

```js
bonsaiPostcss({
  content: ['./src/**/*.tsx'],
  verbose: true,
});
```

Output:

```
[bonsaicss] src/styles.css: 42/128 rules removed (31.2% reduction)
```

## How It Works

The plugin hooks into PostCSS's `Once` event, which runs after all other plugins have processed the CSS. This means it works well with preprocessors like Sass, Less, or Tailwind CSS — BonsaiCSS prunes the **final** CSS output.

## License

MIT
