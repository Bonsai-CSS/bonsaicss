import { createRequire } from 'module';

type ColorFn = (value: string) => string;
interface PicoColors {
    bold: ColorFn;
    green: ColorFn;
    cyan: ColorFn;
    yellow: ColorFn;
    red: ColorFn;
}

const identity: ColorFn = (value: string) => value;
const fallback: PicoColors = {
    bold: identity,
    green: identity,
    cyan: identity,
    yellow: identity,
    red: identity,
};

function loadColors(): PicoColors {
    try {
        const require = createRequire(import.meta.url);
        const loaded = require('picocolors') as Partial<PicoColors>;
        return {
            bold: loaded.bold ?? identity,
            green: loaded.green ?? identity,
            cyan: loaded.cyan ?? identity,
            yellow: loaded.yellow ?? identity,
            red: loaded.red ?? identity,
        };
    } catch {
        return fallback;
    }
}

const pc = loadColors();

const PREFIX = pc.bold(pc.green('[bonsaicss]'));

function line(message: string): string {
    return `${PREFIX} ${message}\n`;
}

export function writeInfo(message: string): void {
    process.stderr.write(line(pc.cyan(message)));
}

export function writeSuccess(message: string): void {
    process.stderr.write(line(pc.green(message)));
}

export function writeWarning(message: string): void {
    process.stderr.write(line(pc.yellow(message)));
}

export function writeError(message: string): void {
    process.stderr.write(line(pc.red(message)));
}
