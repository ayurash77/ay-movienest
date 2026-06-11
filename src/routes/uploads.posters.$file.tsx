import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createFileRoute } from '@tanstack/react-router';

const MIME_BY_EXT: Record<string, string> = {
    jpg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
};

export const Route = createFileRoute('/uploads/posters/$file')({
    server: {
        handlers: {
            GET: async ({ params }) => {
                // Strict name check doubles as path-traversal protection
                const match = params.file.match(/^([a-f0-9]+)\.(jpg|png|webp)$/);
                if (!match) {
                    return new Response('Not found', { status: 404 });
                }

                try {
                    const buf = await readFile(
                        join(process.cwd(), 'uploads', 'posters', params.file),
                    );
                    return new Response(new Uint8Array(buf), {
                        headers: {
                            'content-type': MIME_BY_EXT[match[2]],
                            'cache-control': 'public, max-age=31536000, immutable',
                        },
                    });
                } catch {
                    return new Response('Not found', { status: 404 });
                }
            },
        },
    },
});
