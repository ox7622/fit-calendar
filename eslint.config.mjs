import nx from '@nx/eslint-plugin';
import { react, nestjs, base } from './libs/eslint-plugin/src/flat-configs.mjs';

export default [
    ...nx.configs['flat/base'],
    ...nx.configs['flat/typescript'],
    ...nx.configs['flat/javascript'],
    {
        ignores: [
            '**/dist',
            '**/node_modules',
            '**/tmp',
            '**/vite.config.*.timestamp*',
            '**/vitest.config.*.timestamp*',
        ],
    },

    // Базовые правила для всех файлов
    {
        files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
        rules: {
            '@nx/enforce-module-boundaries': [
                'error',
                {
                    enforceBuildableLibDependency: true,
                    allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$'],
                    depConstraints: [
                        {
                            sourceTag: '*',
                            onlyDependOnLibsWithTags: ['*'],
                        },
                    ],
                },
            ],
        },
    },

    // Shared libraries (shared, sdk, db, ui) - base configuration
    {
        files: [
            'libs/shared/**/*.ts',
            'libs/shared/**/*.tsx',
            'libs/shared/**/*.js',
            'libs/shared/**/*.jsx',
            'libs/sdk/**/*.ts',
            'libs/sdk/**/*.tsx',
            'libs/sdk/**/*.js',
            'libs/sdk/**/*.jsx',
            'libs/db/**/*.ts',
            'libs/ui/**/*.ts',
            'libs/ui/**/*.tsx',
        ],
        ...base,
        languageOptions: {
            ...base.languageOptions,
            parserOptions: {
                ...base.languageOptions.parserOptions,
                project: [
                    'libs/shared/tsconfig*.json',
                    'libs/sdk/tsconfig*.json',
                    'libs/db/tsconfig*.json',
                    'libs/ui/tsconfig*.json',
                ],
            },
        },
    },

    // NestJS библиотека (nest-shared) - nestjs конфигурация
    {
        files: [
            'libs/nest-shared/**/*.ts',
            'libs/nest-shared/**/*.tsx',
            'libs/nest-shared/**/*.js',
            'libs/nest-shared/**/*.jsx',
        ],
        ...nestjs,
        languageOptions: {
            ...nestjs.languageOptions,
            parserOptions: {
                ...nestjs.languageOptions.parserOptions,
                project: ['libs/nest-shared/tsconfig*.json'],
            },
        },
        rules: {
            ...nestjs.rules,
            // Специальные правила для файлов миграций
            'filename-rules/match': 'off', // отключаем глобально, включим только для миграций
        },
    },

    // Специальные правила для файлов миграций в nest-shared
    {
        files: ['libs/nest-shared/**/migrations/**/[0-9][0-9]*-[A-Z][a-zA-Z0-9]*.ts'],
        rules: {
            'filename-rules/match': 'off',
        },
    },

    // React projects (admin, mini-app)
    {
        files: [
            'apps/admin/**/*.ts',
            'apps/admin/**/*.tsx',
            'apps/admin/**/*.js',
            'apps/admin/**/*.jsx',
            'apps/mini-app/**/*.ts',
            'apps/mini-app/**/*.tsx',
            'apps/mini-app/**/*.js',
            'apps/mini-app/**/*.jsx',
        ],
        ignores: ['**/webpack.config.js', '**/*.config.js', '**/vite.config.ts'],
        ...react,
        languageOptions: {
            ...react.languageOptions,
            parserOptions: {
                ...react.languageOptions.parserOptions,
                project: ['apps/admin/tsconfig*.json', 'apps/mini-app/tsconfig*.json'],
            },
        },
    },

    // NestJS projects (api)
    {
        files: ['apps/api/**/*.ts', 'apps/api/**/*.js'],
        ignores: ['**/webpack.config.js', '**/*.config.js'],
        ...nestjs,
        languageOptions: {
            ...nestjs.languageOptions,
            parserOptions: {
                ...nestjs.languageOptions.parserOptions,
                project: ['apps/api/tsconfig*.json'],
            },
        },
    },

    // Node projects (bot)
    {
        files: ['apps/bot/**/*.ts', 'apps/bot/**/*.js'],
        ignores: ['**/webpack.config.js', '**/*.config.js'],
        ...base,
        languageOptions: {
            ...base.languageOptions,
            parserOptions: {
                ...base.languageOptions.parserOptions,
                project: ['apps/bot/tsconfig*.json'],
            },
        },
    },

    // Простые правила для конфигурационных файлов
    {
        files: ['**/webpack.config.js', '**/*.config.js'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
        },
        rules: {
            'no-unused-vars': 'warn',
            'no-console': 'off',
        },
    },
];
