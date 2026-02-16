# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

### Planned for 0.2.0

> The following features are planned for the upcoming 0.2.0 release.
> Implementation details may change before release.

#### Added

- Public custom extractor API with file matcher support:
  - Callback extractor
  - Structured extractor (`{ name, test, extract }`)
  - Regex-based extraction strategy
- Expanded scanner support:
  - Astro `class:list`
  - Solid `classList={...}`
  - Blade `@class(...)`
  - Rails `class_names(...)`
- Advanced reporting improvements:
  - `reportVersion: 1` in JSON report
  - Interactive HTML report filters
  - Class-level “why” column
  - CI metrics fields (`report_version`, `size_after_kb`, `unused_css_percent`)
- Persistent filesystem scan cache
- Benchmark script for cold vs warm runs
- CLI improvements:
  - Dynamic config discovery
  - `init` command with interactive mode
  - CI gatekeeper mode (`--ci`, budgets)
  - Improved terminal UX

#### Behavior Changes (Planned)

- `extractors` will run in exclusive mode when provided.
- Persistent cache enabled by default.
- CI mode will require at least one budget flag.

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
