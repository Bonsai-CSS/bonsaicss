# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](https://semver.org/).

---

## [0.2.0] - unreleased

### Added

- **Core (`@bonsaicss/core`)**
  - Public custom extractor API with file matcher support:
    - callback extractor
    - definition extractor (`{ name, test, extract }`)
    - regex-based extraction strategy
  - Expanded scanner support:
    - Astro `class:list`
    - Solid `classList={...}`
    - Blade `@class(...)`
    - Rails `class_names(...)`
  - Advanced reporting improvements:
    - `reportVersion: 1` in JSON report
    - interactive HTML report filters (class/status)
    - class-level “why” column and enriched metrics
    - CI report fields: `report_version`, `size_after_kb`, `unused_css_percent`
  - Persistent file-system scan cache:
    - `node_modules/.cache/bonsaicss/scan-cache-v1.json`
    - invalidation by file signature (`mtime`, `size`) and mode
  - Benchmark script for cold vs warm runs.

- **CLI (`@bonsaicss/cli`)**
  - Dynamic config support:
    - `bonsai.config.{json,js,cjs,mjs,ts,mts,cts}`
    - config autodiscovery when `--config` is omitted
  - `init` command:
    - framework detection
    - interactive mode on TTY
    - non-interactive mode via `--yes`
  - CI gatekeeper mode:
    - `--ci`
    - `--max-unused-percent`
    - `--max-final-kb`
  - Terminal UX improvements:
    - colored output support (`picocolors`)
    - clearer warning/error messages.

- **BonsaiLab (`@bonsaicss/bonsailab`)**
  - Framework options/presets for Astro and Solid.
  - Worker scanner coverage aligned with core patterns.

### Changed

- Core extractor behavior is now explicit and documented as **exclusive** when `extractors` is provided.
- CLI watch mode now reports initial-run failure without crashing the watcher.
- CLI config/watch path handling was hardened for cross-platform resolution behavior.

### Behavior Changes

- `extractors` (core) now run in exclusive mode:
  - when non-empty, built-in scanner heuristics are skipped.
- CI budgets (CLI) are enforced when enabled:
  - `--ci` requires at least one budget.
- Persistent scanner cache is enabled by default in core.
- `init` uses interactive prompts by default in TTY; use `--yes` for automation.

### Performance

- Faster repeat scans in large projects with persistent cache reuse.
- New benchmark tooling to measure cold vs warm performance.

### Documentation

- Migration sections added to core and CLI READMEs.
- Full `bonsai.config.ts` example covering `extractors`, `ci`, and `report`.
- Root README updated with v0.2.0 migration links and framework support updates.

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
