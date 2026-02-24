import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/cli.ts'],
    format: ['cjs'],
    dts: false,
    sourcemap: true,
    clean: true,
    splitting: false,
    noExternal: ['prompts'],
    outDir: 'dist',
    external: ['@bonsaicss/core'],
    banner: {
        js: '#!/usr/bin/env node',
    },
});
