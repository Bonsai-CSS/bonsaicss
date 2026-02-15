import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    // ── Base ─────────────────────────────────────────────────────────────────
    eslint.configs.recommended,

    // ── TypeScript: strict + type-checked + stylistic ────────────────────────
    ...tseslint.configs.strictTypeChecked,
    ...tseslint.configs.stylisticTypeChecked,

    // ── Source files ─────────────────────────────────────────────────────────
    {
        files: ['packages/*/src/**/*.ts'],
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            // ── Strictness overrides ─────────────────────────────────────────

            // Allow _ prefixed unused vars
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                    caughtErrorsIgnorePattern: '^_',
                },
            ],

            // Allow require() — needed in PostCSS plugin
            '@typescript-eslint/no-require-imports': 'off',

            // Allow non-null assertions sparingly
            '@typescript-eslint/no-non-null-assertion': 'warn',

            // Restrict `any` to warnings
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-unsafe-assignment': 'warn',
            '@typescript-eslint/no-unsafe-member-access': 'warn',
            '@typescript-eslint/no-unsafe-call': 'warn',
            '@typescript-eslint/no-unsafe-argument': 'warn',
            '@typescript-eslint/no-unsafe-return': 'warn',

            // ── Code quality ─────────────────────────────────────────────────

            // Enforce consistent type imports
            '@typescript-eslint/consistent-type-imports': [
                'error',
                { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
            ],

            // Enforce consistent type exports
            '@typescript-eslint/consistent-type-exports': [
                'error',
                { fixMixedExportsWithInlineTypeSpecifier: true },
            ],

            // Prefer nullish coalescing over logical OR for nullable values
            '@typescript-eslint/prefer-nullish-coalescing': 'error',

            // No unnecessary conditions (always-truthy checks, etc.)
            '@typescript-eslint/no-unnecessary-condition': 'warn',

            // Prefer includes() over indexOf() !== -1
            '@typescript-eslint/prefer-includes': 'error',

            // Prefer for-of over indexed for loops
            '@typescript-eslint/prefer-for-of': 'error',

            // Switch must be exhaustive
            '@typescript-eslint/switch-exhaustiveness-check': 'error',

            // No confusing void expressions
            '@typescript-eslint/no-confusing-void-expression': [
                'error',
                { ignoreArrowShorthand: true },
            ],

            // ── Style ────────────────────────────────────────────────────────

            // Consistent array type syntax: T[] for simple, Array<T> for complex
            '@typescript-eslint/array-type': [
                'error',
                { default: 'array-simple' },
            ],

            // Consistent type assertions
            '@typescript-eslint/consistent-type-assertions': [
                'error',
                { assertionStyle: 'as', objectLiteralTypeAssertions: 'allow' },
            ],

            // ── Vanilla ESLint extras ────────────────────────────────────────
            'no-console': ['warn', { allow: ['warn', 'error'] }],
            'prefer-const': 'error',
            'no-var': 'error',
            eqeqeq: ['error', 'always'],
            curly: ['error', 'multi-line'],
        },
    },

    // ── Test files (relaxed) ─────────────────────────────────────────────────
    {
        files: ['packages/*/tests/**/*.ts'],
        rules: {
            '@typescript-eslint/no-non-null-assertion': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-unsafe-assignment': 'off',
            '@typescript-eslint/no-unsafe-member-access': 'off',
            '@typescript-eslint/no-unsafe-call': 'off',
            'no-console': 'off',
        },
    },

    // ── Ignores ──────────────────────────────────────────────────────────────
    {
        ignores: [
            '**/dist/**',
            '**/node_modules/**',
            '**/*.config.ts',
            '**/*.config.mjs',
        ],
    },
);
