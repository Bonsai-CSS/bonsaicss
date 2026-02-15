# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](https://semver.org/).

---

## [0.1.0] - 2026-02-14

### Added

- Initial release of **BonsaiCSS**
- `@bonsaicss/core` AST-first scanning and pruning engine
- PostCSS plugin
- Rollup / Vite plugin
- esbuild plugin
- Webpack 5 plugin
- CLI for standalone pruning
- BonsaiLab playground
- Safe and Aggressive pruning modes
- Dynamic class pattern detection
- Safelist and regex safelist support
- Worker-based pruning in playground
- Monaco-powered editor environment
- Multi-framework scanning:
  - HTML
  - JSX / TSX
  - Vue
  - Svelte
  - Angular
  - JS/TS `classList`, `clsx`, `classnames`

### Performance

- Fast CSS AST pruning powered by `css-tree`
- Optimized scanning pipeline
- Worker-based execution in BonsaiLab

### Documentation

- Full README with Quick Start
- Programmatic API examples
- CLI usage instructions
- Playground instructions

---
