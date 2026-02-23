import fs from 'fs';
import path from 'path';

import { findDefaultConfigPath, resolveMaybeAbsolute } from './config.js';
import type { InitOptions } from './types.js';

type Framework = 'react' | 'vue' | 'svelte' | 'angular' | 'astro' | 'solid' | 'vanilla';

const SUPPORTED_EXTENSIONS = new Set(['.json', '.js', '.cjs', '.mjs', '.ts', '.cts', '.mts']);

function readJsonFile(filePath: string): Record<string, unknown> | undefined {
    if (!fs.existsSync(filePath)) return undefined;
    try {
        const raw = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(raw) as Record<string, unknown>;
    } catch {
        return undefined;
    }
}

function getFrameworkFromPackageJson(cwd: string): Framework {
    const pkgPath = path.join(cwd, 'package.json');
    const pkg = readJsonFile(pkgPath);
    if (!pkg) return 'vanilla';

    const dependencies = {
        ...(pkg.dependencies as Record<string, unknown> | undefined),
        ...(pkg.devDependencies as Record<string, unknown> | undefined),
    };

    const has = (name: string) => dependencies[name] !== undefined;

    if (has('astro')) return 'astro';
    if (has('@angular/core')) return 'angular';
    if (has('svelte')) return 'svelte';
    if (has('vue')) return 'vue';
    if (has('solid-js')) return 'solid';
    if (has('react') || has('next') || has('preact')) return 'react';
    return 'vanilla';
}

function getContentGlob(framework: Framework): string {
    switch (framework) {
        case 'react':
        case 'solid':
            return 'src/**/*.{html,js,jsx,ts,tsx}';
        case 'vue':
            return 'src/**/*.{html,js,ts,vue}';
        case 'svelte':
            return 'src/**/*.{html,js,ts,svelte}';
        case 'angular':
            return 'src/**/*.{html,ts}';
        case 'astro':
            return 'src/**/*.{astro,html,js,ts,jsx,tsx,vue,svelte}';
        case 'vanilla':
            return 'src/**/*.{html,js,ts}';
    }
}

function detectCssEntry(cwd: string): string {
    const candidates = ['src/styles.css', 'src/index.css', 'styles.css', 'app.css'];
    for (const candidate of candidates) {
        if (fs.existsSync(path.join(cwd, candidate))) return candidate;
    }
    return 'src/styles.css';
}

function normalizeFramework(value: string | undefined): Framework | undefined {
    if (!value) return undefined;
    const lower = value.toLowerCase();
    if (
        lower === 'react' ||
        lower === 'vue' ||
        lower === 'svelte' ||
        lower === 'angular' ||
        lower === 'astro' ||
        lower === 'solid' ||
        lower === 'vanilla'
    ) {
        return lower;
    }
    throw new Error(`Unsupported framework: ${value}`);
}

function resolveTargetConfigPath(options: InitOptions): string {
    if (options.configPath) {
        return resolveMaybeAbsolute(options.cwd, options.configPath);
    }

    const existing = findDefaultConfigPath(options.cwd);
    if (existing) return existing;
    return path.join(options.cwd, 'bonsai.config.ts');
}

function serializeConfig(targetPath: string, config: Record<string, unknown>): string {
    const ext = path.extname(targetPath).toLowerCase();
    if (!SUPPORTED_EXTENSIONS.has(ext)) {
        throw new Error(`Unsupported config extension: ${ext || '(none)'}`);
    }

    if (ext === '.json') {
        return `${JSON.stringify(config, null, 2)}\n`;
    }

    return `export default ${JSON.stringify(config, null, 2)};\n`;
}

export function runInit(options: InitOptions): void {
    const framework =
        normalizeFramework(options.framework) ?? getFrameworkFromPackageJson(options.cwd);
    const targetPath = resolveTargetConfigPath(options);

    if (fs.existsSync(targetPath) && !options.force) {
        throw new Error(
            `Config already exists: ${targetPath}. Use --force to overwrite or pass --config for a new file.`,
        );
    }

    const config = {
        cwd: '.',
        content: [getContentGlob(framework)],
        css: [detectCssEntry(options.cwd)],
        out: 'dist/styles.pruned.css',
        minify: true,
    };

    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, serializeConfig(targetPath, config), 'utf8');

    process.stdout.write(`[bonsaicss] Created ${targetPath}\n`);
    process.stdout.write(`[bonsaicss] Framework: ${framework}\n`);
    process.stdout.write('[bonsaicss] Next step: bonsaicss --config ');
    process.stdout.write(
        `${path.relative(options.cwd, targetPath) || path.basename(targetPath)}\n`,
    );
}
