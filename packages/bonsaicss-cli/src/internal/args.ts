import type { ParsedArgs } from './types.js';

export function printHelp(): void {
    process.stdout.write(
        `BonsaiCSS CLI\n\nUsage:\n  bonsaicss --content <glob> --css <file.css> [options]\n\nRequired:\n  --content, -c <glob>          Content glob pattern (repeatable)\n  --css, -i <file.css>          CSS file path (repeatable)\n\nOptions:\n  --config <file.json>          Load JSON config file\n  --out, -o <file.css>          Write pruned CSS to file (defaults to stdout)\n  --cwd <path>                  Base directory to resolve globs/files\n  --safelist <a,b,c>            Keep exact classes (CSV or repeatable)\n  --safelist-pattern <regex>    Keep classes by regex pattern (repeatable)\n  --keep-dynamic-patterns       Infer dynamic class patterns\n  --dynamic-pattern <regex>     Extra dynamic patterns (repeatable)\n  --minify                      Emit minified CSS output\n  --analyze [file.json]         Emit legacy class-origin report\n  --report-json [file.json]     Emit advanced JSON report\n  --report-html [file.html]     Emit HTML report\n  --report-ci [file.txt]        Emit compact CI stats\n  --verbose                     Print detailed run summary\n  --stats                       Print machine-readable stats JSON\n  --watch                       Watch files and re-run on changes\n  --help, -h                    Show this help\n`,
    );
}

function splitCsv(value: string): string[] {
    return value
        .split(',')
        .map(v => v.trim())
        .filter(Boolean);
}

function consumeOptionalValue(argv: string[], index: number): { value?: string; consumed: number } {
    const next = argv[index + 1];
    if (!next || next.startsWith('-')) return { consumed: 0 };
    return { value: next, consumed: 1 };
}

export function parseArgs(argv: string[]): ParsedArgs {
    const parsed: ParsedArgs = {
        content: [],
        css: [],
        safelist: [],
        safelistPatterns: [],
        dynamicPatterns: [],
    };

    for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i] ?? '';
        const next = argv[i + 1];

        switch (arg) {
            case '--':
                break;
            case '--help':
            case '-h':
                parsed.help = true;
                break;
            case '--config':
                if (!next || next.startsWith('-')) throw new Error('Missing value for --config');
                parsed.configPath = next;
                i += 1;
                break;
            case '--content':
            case '-c':
                if (!next || next.startsWith('-')) throw new Error('Missing value for --content');
                parsed.content.push(...splitCsv(next));
                i += 1;
                break;
            case '--css':
            case '-i':
                if (!next || next.startsWith('-')) throw new Error('Missing value for --css');
                parsed.css.push(...splitCsv(next));
                i += 1;
                break;
            case '--out':
            case '-o':
                if (!next || next.startsWith('-')) throw new Error('Missing value for --out');
                parsed.out = next;
                i += 1;
                break;
            case '--cwd':
                if (!next || next.startsWith('-')) throw new Error('Missing value for --cwd');
                parsed.cwd = next;
                i += 1;
                break;
            case '--safelist':
                if (!next || next.startsWith('-')) throw new Error('Missing value for --safelist');
                parsed.safelist.push(...splitCsv(next));
                i += 1;
                break;
            case '--safelist-pattern':
                if (!next || next.startsWith('-')) {
                    throw new Error('Missing value for --safelist-pattern');
                }
                parsed.safelistPatterns.push(next);
                i += 1;
                break;
            case '--keep-dynamic-patterns':
                parsed.keepDynamicPatterns = true;
                break;
            case '--dynamic-pattern':
                if (!next || next.startsWith('-')) {
                    throw new Error('Missing value for --dynamic-pattern');
                }
                parsed.dynamicPatterns.push(next);
                i += 1;
                break;
            case '--minify':
                parsed.minify = true;
                break;
            case '--analyze': {
                const { value, consumed } = consumeOptionalValue(argv, i);
                parsed.analyze = value ?? true;
                i += consumed;
                break;
            }
            case '--report-json': {
                const { value, consumed } = consumeOptionalValue(argv, i);
                parsed.reportJson = value ?? true;
                i += consumed;
                break;
            }
            case '--report-html': {
                const { value, consumed } = consumeOptionalValue(argv, i);
                parsed.reportHtml = value ?? true;
                i += consumed;
                break;
            }
            case '--report-ci': {
                const { value, consumed } = consumeOptionalValue(argv, i);
                parsed.reportCi = value ?? true;
                i += consumed;
                break;
            }
            case '--verbose':
                parsed.verbose = true;
                break;
            case '--stats':
                parsed.stats = true;
                break;
            case '--watch':
                parsed.watch = true;
                break;
            default:
                throw new Error(`Unknown option: ${arg}`);
        }
    }

    return parsed;
}
