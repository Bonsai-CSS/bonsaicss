import fs from 'fs';
import path from 'path';
import type prompts from 'prompts';

import { findDefaultConfigPath, resolveMaybeAbsolute } from './config.js';
import type { InitOptions } from './types.js';
import { writeError, writeInfo, writeSuccess } from './output.js';

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

function isInteractiveInit(options: InitOptions): boolean {
    return process.stdin.isTTY && process.stdout.isTTY && options.yes !== true;
}

function loadPrompts(): typeof prompts | null {
    try {
        const loaded = require('prompts') as unknown;
        const mod = loaded as { default?: typeof prompts };
        return mod.default ?? (mod as unknown as typeof prompts);
    } catch {
        return null;
    }
}

async function resolveFramework(options: InitOptions): Promise<Framework> {
    const inferred =
        normalizeFramework(options.framework) ?? getFrameworkFromPackageJson(options.cwd);
    if (!isInteractiveInit(options) || options.framework) return inferred;
    const prompts = loadPrompts();
    if (!prompts) {
        writeInfo(
            'Interactive prompts are unavailable (install "prompts"), using inferred defaults.',
        );
        return inferred;
    }

    const response = await prompts(
        {
            type: 'select',
            name: 'framework',
            message: 'Select your framework',
            initial: ['react', 'vue', 'svelte', 'angular', 'astro', 'solid', 'vanilla'].indexOf(
                inferred,
            ),
            choices: [
                { title: 'React', value: 'react' },
                { title: 'Vue', value: 'vue' },
                { title: 'Svelte', value: 'svelte' },
                { title: 'Angular', value: 'angular' },
                { title: 'Astro', value: 'astro' },
                { title: 'Solid', value: 'solid' },
                { title: 'Vanilla', value: 'vanilla' },
            ],
        },
        {
            onCancel: () => {
                throw new Error('Initialization cancelled by user.');
            },
        },
    );

    const selected = (response as { framework?: string }).framework;
    return normalizeFramework(selected) ?? inferred;
}

async function shouldOverwriteExisting(targetPath: string, options: InitOptions): Promise<boolean> {
    if (!fs.existsSync(targetPath)) return true;
    if (options.force) return true;
    if (!isInteractiveInit(options)) return false;
    const prompts = loadPrompts();
    if (!prompts) {
        writeInfo('Interactive prompts are unavailable (install "prompts"), refusing overwrite.');
        return false;
    }

    writeInfo(`Config already exists: ${targetPath}`);
    const response = await prompts(
        {
            type: 'confirm',
            name: 'overwrite',
            message: 'Overwrite existing config file?',
            initial: false,
        },
        {
            onCancel: () => {
                throw new Error('Initialization cancelled by user.');
            },
        },
    );
    return response.overwrite === true;
}

export async function runInit(options: InitOptions): Promise<void> {
    const framework = await resolveFramework(options);
    const targetPath = resolveTargetConfigPath(options);

    if (!(await shouldOverwriteExisting(targetPath, options))) {
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

    try {
        fs.mkdirSync(path.dirname(targetPath), { recursive: true });
        fs.writeFileSync(targetPath, serializeConfig(targetPath, config), 'utf8');
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        writeError(`Failed to create config file: ${message}`);
        throw err;
    }

    writeSuccess(`Created ${targetPath}`);
    writeInfo(`Framework: ${framework}`);
    writeInfo(
        `Next step: bonsaicss --config ${path.relative(options.cwd, targetPath) || path.basename(targetPath)}`,
    );
}
