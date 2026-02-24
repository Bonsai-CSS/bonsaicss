import type { CiOptions, RunResult } from './types';

/**
 * Evaluates CI budgets and returns an array of error messages if any budget is exceeded.
 */
export function evaluateCIBudgets(ci: CiOptions | undefined, result: RunResult): string[] {
    if (!ci?.enabled) return [];
    const messages: string[] = [];
    if (typeof ci.maxUnusedPercent === 'number') {
        const unusedPercent =
            result.stats.totalRules > 0
                ? (result.stats.removedRules / result.stats.totalRules) * 100
                : 0;
        if (unusedPercent > ci.maxUnusedPercent) {
            messages.push(
                `Unused CSS percent (${unusedPercent.toFixed(2)}%) exceeds max (${ci.maxUnusedPercent.toFixed(2)}%)`,
            );
        }
    }
    if (typeof ci.maxFinalKb === 'number') {
        const finalKb = result.stats.prunedSize / 1024;
        if (finalKb > ci.maxFinalKb) {
            messages.push(
                `Final CSS size (${finalKb.toFixed(2)} KB) exceeds max (${ci.maxFinalKb.toFixed(2)} KB)`,
            );
        }
    }
    return messages;
}
