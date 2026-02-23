import { createLineResolver, dedupeRegex, tokenizeClassList } from '../../../bonsaicss/src/utils';

import type { DetectedClass, DetectionType } from '../engine/types';

function classifyDetectionType(line: string, className: string): DetectionType {
    const escaped = className.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    if (/\$\{[^}]+\}/.test(line)) return 'template';
    if (new RegExp('[\'"`]\\s*' + escaped + '\\s*[\'"`]\\s*:').test(line)) return 'object';
    if (/['"`][a-zA-Z0-9_-]+-['"`]\s*\+/.test(line)) return 'dynamic';
    if (new RegExp('[\'"`]' + escaped + '[\'"`]').test(line)) return 'literal';

    return 'literal';
}

export function scanSourceForClasses(
    source: string,
    file: string,
    collectDynamicPatterns: boolean,
): {
    classes: Set<string>;
    dynamicPatterns: RegExp[];
    detectedClasses: DetectedClass[];
} {
    const classes = new Set<string>();
    const dynamicPatterns: RegExp[] = [];
    const detectedClasses: DetectedClass[] = [];

    const lineMap = source.split(/\r?\n/);
    const resolveLine = createLineResolver(source);
    const seen = new Set<string>();

    const addClass = (className: string, index: number): void => {
        if (!className) return;
        classes.add(className);

        const line = resolveLine(index);
        const lineText = lineMap[Math.max(0, line - 1)] ?? '';
        const type = classifyDetectionType(lineText, className);
        const key = `${className}|${file}|${line.toString()}`;
        if (seen.has(key)) return;
        seen.add(key);

        detectedClasses.push({
            name: className,
            file,
            line,
            type,
        });
    };

    const parseExpression = (expression: string, index: number): void => {
        const quoted = expression.matchAll(
            /'([^'\\]*(?:\\.[^'\\]*)*)'|"([^"\\]*(?:\\.[^"\\]*)*)"/g,
        );
        for (const match of quoted) {
            const value = match[1] ?? match[2] ?? '';
            tokenizeClassList(value).forEach(token => {
                if (token.endsWith('-')) return;
                addClass(token, index);
            });
        }

        const templates = expression.matchAll(/`([\s\S]*?)`/g);
        for (const match of templates) {
            const raw = match[1] ?? '';
            const staticParts = raw.split(/\$\{[^}]*\}/g);
            staticParts.forEach(part => {
                tokenizeClassList(part).forEach(token => {
                    if (token.endsWith('-')) {
                        if (collectDynamicPatterns) {
                            dynamicPatterns.push(new RegExp(`^${token}`));
                        }
                        return;
                    }
                    addClass(token, index);
                });
            });
        }

        const objectKeys = expression.matchAll(
            /(?:^|[{,]\s*)(['"]?)([a-zA-Z0-9_-][a-zA-Z0-9_:\-./]*)\1\s*:/g,
        );
        for (const match of objectKeys) {
            const key = match[2] ?? '';
            tokenizeClassList(key).forEach(token => addClass(token, index));
        }

        if (!collectDynamicPatterns) return;

        const concatMatches = expression.matchAll(/['"`]([a-zA-Z0-9_-]+-)['"`]\s*\+/g);
        for (const match of concatMatches) {
            const prefix = match[1] ?? '';
            if (prefix) dynamicPatterns.push(new RegExp(`^${prefix}`));
        }

        const templateMatches = expression.matchAll(/`([^`]*?)\$\{[^}]+\}([^`]*)`/g);
        for (const match of templateMatches) {
            const chunks = [match[1] ?? '', match[2] ?? ''];
            chunks.forEach(chunk => {
                tokenizeClassList(chunk).forEach(token => {
                    if (token.endsWith('-')) {
                        dynamicPatterns.push(new RegExp(`^${token}`));
                    }
                });
            });
        }
    };

    const staticClassRe = /\bclass(?:Name)?\s*=\s*["']([^"']+)["']/g;
    let staticMatch = staticClassRe.exec(source);
    while (staticMatch) {
        const value = staticMatch[1] ?? '';
        tokenizeClassList(value).forEach(token => addClass(token, staticMatch?.index ?? 0));
        staticMatch = staticClassRe.exec(source);
    }

    const svelteDirectiveRe = /\bclass:([a-zA-Z0-9_-]+)/g;
    let svelteMatch = svelteDirectiveRe.exec(source);
    while (svelteMatch) {
        addClass(svelteMatch[1] ?? '', svelteMatch.index);
        svelteMatch = svelteDirectiveRe.exec(source);
    }

    const angularShortcutRe = /\[class\.([a-zA-Z0-9_-]+)\]/g;
    let angularMatch = angularShortcutRe.exec(source);
    while (angularMatch) {
        addClass(angularMatch[1] ?? '', angularMatch.index);
        angularMatch = angularShortcutRe.exec(source);
    }

    const expressionRegexes = [
        // Handles template literals with nested ${...} blocks safely.
        /\bclassName\s*=\s*\{(`([\s\S]*?)`)\}/g,
        // Handles simple non-nested expressions.
        /\bclassName\s*=\s*\{([^{}]*)\}/g,
        /\bclassList\s*=\s*\{([^{}]*)\}/g,
        /\b:class\s*=\s*["']([^"']*)["']/g,
        /\bclass:list\s*=\s*["']([^"']*)["']/g,
        /\bclass:list\s*=\s*\{([^{}]*)\}/g,
        /\b\[ngClass\]\s*=\s*["']([^"']*)["']/g,
        /\bclassList\.(?:add|remove|toggle|contains|replace)\s*\(([^)]*)\)/g,
        /@class\s*\(([^)]*)\)/g,
        /\bclass:\s*["']([^"']*)["']/g,
        /\b(?:class_names|classNames)\s*\(([^)]*)\)/g,
        /\b(?:clsx|classnames|cn)\s*\(([^)]*)\)/g,
    ];

    expressionRegexes.forEach(regex => {
        let match = regex.exec(source);
        while (match) {
            parseExpression(match[1] ?? '', match.index);
            match = regex.exec(source);
        }
    });

    return {
        classes,
        dynamicPatterns: dedupeRegex(dynamicPatterns),
        detectedClasses,
    };
}
