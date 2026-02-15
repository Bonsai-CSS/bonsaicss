import type { Framework } from '../engine/types';

const frameworkFileHints: Record<Framework, RegExp[]> = {
    vanilla: [/\.(html|js|ts|mjs|cjs)$/i],
    react: [/\.(jsx|tsx|js|ts|html)$/i],
    vue: [/\.vue$/i, /\.(js|ts)$/i],
    svelte: [/\.svelte$/i, /\.(js|ts)$/i],
    angular: [/\.(html|component\.ts|directive\.ts|service\.ts|js|ts)$/i],
};

export function now(): number {
    return performance.now();
}

export function isFrameworkFile(file: string, framework: Framework): boolean {
    return frameworkFileHints[framework].some(hint => hint.test(file));
}
