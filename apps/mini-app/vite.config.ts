/// <reference types='vitest' />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin';
import { resolve } from 'path';

export default defineConfig(() => ({
    root: __dirname,
    cacheDir: '../../node_modules/.vite/apps/mini-app',
    server: {
        port: 4200,
        host: 'localhost',
        allowedHosts: ['.trycloudflare.com'],
    },
    preview: {
        port: 4200,
        host: 'localhost',
        // `true` disables Vite's Host-header check entirely. The trycloudflare
        // hostname rotates every wrapper cycle and Vite 6's wildcard syntax
        // (`'.trycloudflare.com'`) isn't honoured by `preview.allowedHosts`.
        // Safe locally because the preview server binds to 127.0.0.1 — only
        // the cloudflared tunnel reaches it.
        allowedHosts: true,
    },
    plugins: [react(), tailwindcss(), nxViteTsPaths(), nxCopyAssetsPlugin(['*.md'])],
    resolve: {
        alias: {
            '@': resolve(__dirname, './src'),
        },
    },
    build: {
        outDir: '../../dist/apps/mini-app',
        emptyOutDir: true,
        reportCompressedSize: true,
        commonjsOptions: {
            transformMixedEsModules: true,
        },
    },
}));
