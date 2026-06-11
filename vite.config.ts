import { defineConfig, loadEnv } from 'vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import tailwindcss from '@tailwindcss/vite';
import viteReact from '@vitejs/plugin-react';
import viteTsConfigPaths from 'vite-tsconfig-paths';
import { fileURLToPath, URL } from 'url';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    // Comma-separated list of extra hosts the preview server may be reached at
    // (e.g. the production domain behind the hosting proxy)
    const extraHosts = (env.WEB_ALLOWED_HOSTS ?? '')
        .split(',')
        .map((host) => host.trim())
        .filter(Boolean);

    return {
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
        preview: {
            host: '0.0.0.0',
            strictPort: true,
            // Behind the hosting proxy requests arrive with the public/technical
            // domain in Host; without an explicit list we accept any host —
            // host-checking only matters for local dev servers (DNS rebinding).
            allowedHosts: extraHosts.length > 0 ? extraHosts : true,
        },
    };
});
