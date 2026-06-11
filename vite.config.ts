import { defineConfig } from 'vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import tailwindcss from '@tailwindcss/vite';
import viteReact from '@vitejs/plugin-react';
import viteTsConfigPaths from 'vite-tsconfig-paths';
import { fileURLToPath, URL } from 'url';

export default defineConfig({
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
    plugins: [
        tailwindcss(),
        viteTsConfigPaths({
            projects: [ './tsconfig.json' ],
        }),
        tanstackStart(),
        viteReact(),
    ],
    server: {
        host: '0.0.0.0',
        strictPort: true,
    },
});
