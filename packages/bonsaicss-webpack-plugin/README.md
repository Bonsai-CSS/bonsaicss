# @bonsaicss/webpack-plugin

> Webpack 5 plugin for BonsaiCSS 🌳 — prune unused CSS during webpack builds.

## Installation

```bash
npm install @bonsaicss/webpack-plugin webpack
```

## Setup

### webpack.config.js

```js
const BonsaiCssPlugin = require('@bonsaicss/webpack-plugin');

module.exports = {
  plugins: [
    new BonsaiCssPlugin({
      content: ['./src/**/*.{html,tsx,jsx,vue,svelte}'],
    }),
  ],
};
```

### ESM / TypeScript

```ts
// webpack.config.ts
import BonsaiCssPlugin from '@bonsaicss/webpack-plugin';

export default {
  plugins: [
    new BonsaiCssPlugin({
      content: ['./src/**/*.{html,tsx,jsx,vue,svelte}'],
    }),
  ],
};
```

### With Next.js (custom webpack config)

```js
// next.config.js
const BonsaiCssPlugin = require('@bonsaicss/webpack-plugin');

module.exports = {
  webpack(config) {
    config.plugins.push(
      new BonsaiCssPlugin({
        content: [
          './app/**/*.{tsx,jsx}',
          './components/**/*.{tsx,jsx}',
        ],
      }),
    );
    return config;
  },
};
```

## Options

| Option | Type | Default | Description |
|---|---|---|---|
| `content` | `string[]` | — | **Required.** Glob patterns for content files to scan. |
| `extensions` | `string[]` | `['.css']` | File extensions to process in the asset pipeline. |
| `verbose` | `boolean` | `false` | Log pruning statistics to stderr. |
| `safelist` | `string[]` | `[]` | Class names to always keep. |
| `safelistPatterns` | `(string \| RegExp)[]` | `[]` | Regex patterns for classes to preserve. |
| `keepDynamicPatterns` | `boolean \| (string \| RegExp)[]` | `false` | Infer or provide dynamic class patterns. |

## How It Works

The plugin hooks into webpack's `processAssets` at the **`OPTIMIZE_SIZE`** stage. This runs after CSS has been extracted (e.g., by `mini-css-extract-plugin`) and before the final output is written. It:

1. Iterates over all CSS assets in the compilation
2. Scans content files for class usage (lazily, shared across all CSS assets)
3. Prunes unused rules from each CSS asset
4. Updates the asset in place with the optimized CSS

## Compatibility

- **Webpack** ≥ 5.0
- Works with `mini-css-extract-plugin`, `css-loader`, and other standard CSS tooling.

## License

MIT
