# @bonsaicss/cli

CLI oficial do BonsaiCSS para podar CSS não utilizado.

## Instalação

```bash
npm install -D @bonsaicss/cli
```

## Uso Rápido

```bash
bonsaicss \
  --content "./src/**/*.{html,tsx,jsx,vue,svelte}" \
  --css "./src/styles.css" \
  --minify \
  --out "./dist/styles.pruned.css"
```

Se `--out` não for informado, o CSS podado é enviado para `stdout`.

## Config File (`--config`)

Você pode carregar opções a partir de JSON:

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

Exemplo:

```bash
bonsaicss --config ./bonsai.config.json
```

Precedência: flags de CLI sobrescrevem o arquivo de config.

## Opções

- `--content, -c <glob>` (repetível, obrigatório)
- `--css, -i <arquivo.css>` (repetível, obrigatório)
- `--config <arquivo.json>`
- `--out, -o <arquivo.css>`
- `--cwd <path>`
- `--safelist <classes>` (CSV ou repetível)
- `--safelist-pattern <regex>` (repetível)
- `--keep-dynamic-patterns`
- `--dynamic-pattern <regex>` (repetível)
- `--minify`
- `--analyze [arquivo.json]`
- `--report-json [arquivo.json]`
- `--report-html [arquivo.html]`
- `--report-ci [arquivo.txt]`
- `--verbose`
- `--stats` (JSON compacto em `stderr`)
- `--watch`
- `--help, -h`

## Reporting

Com `--report-*`, o CLI usa o reporting avançado do core.

- `--report-json` sem caminho: `bonsai-report.json`
- `--report-html` sem caminho: `bonsai-report.html`
- `--report-ci` sem caminho: `bonsai-ci-stats.txt`

`--analyze` continua disponível como relatório legado (`bonsai-analysis.json`).

## Watch Mode

Em `--watch`, o CLI observa:

- arquivos de conteúdo resolvidos pelos globs
- arquivos CSS informados em `--css`
- o arquivo passado em `--config` (quando existir)

A cada alteração, o prune é executado novamente.

## Verbose e Stats

- `--verbose`: resumo legível com arquivos/classes/redução
- `--stats`: payload JSON em `stderr` para CI/pipelines

Exemplo de `--stats`:

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
