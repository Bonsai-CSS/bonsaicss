export interface CssDiffLine {
    status: 'kept' | 'removed';
    content: string;
}

function normalizeRule(rule: string): string {
    return rule.replace(/\s+/g, ' ').trim();
}

export function computeCssRuleDiff(beforeCss: string, afterCss: string): CssDiffLine[] {
    const beforeRules = beforeCss
        .split('}')
        .map(chunk => chunk.trim())
        .filter(Boolean)
        .map(chunk => `${chunk}}`);

    const afterSet = new Set(
        afterCss
            .split('}')
            .map(chunk => chunk.trim())
            .filter(Boolean)
            .map(chunk => normalizeRule(`${chunk}}`)),
    );

    return beforeRules.map(rule => {
        const normalized = normalizeRule(rule);
        return {
            status: afterSet.has(normalized) ? 'kept' : 'removed',
            content: rule,
        };
    });
}
