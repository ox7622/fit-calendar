import { resolve } from 'path';

import { defineConfig } from 'vite';

export default defineConfig({
    root: resolve(__dirname),
    test: {
        globals: true,
        environment: 'node',
        include: ['src/**/*.spec.ts', 'src/**/*.test.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html'],
            exclude: ['node_modules/', 'src/**/*.spec.ts', 'src/**/*.test.ts'],
        },
    },
});
