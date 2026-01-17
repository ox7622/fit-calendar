import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        root: resolve(__dirname),
        include: ['src/**/*.spec.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            include: ['src/entities/**/*.ts'],
            exclude: ['src/entities/index.ts', 'src/**/*.spec.ts'],
        },
    },
});
