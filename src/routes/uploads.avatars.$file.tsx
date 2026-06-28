import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createFileRoute } from '@tanstack/react-router';

import { headUploadObject, readUploadObject, storageDriver } from '@/server/storage';

const MIME_BY_EXT: Record<string, string> = {
    jpg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
};

type UploadParams = { file: string };

function parseRequest(params: UploadParams) {
    // Strict name check doubles as path-traversal protection
    const match = params.file.match(/^([a-f0-9]+)\.(jpg|png|webp)$/);
    if (!match) return null;
    return {
        key: `avatars/${params.file}`,
        contentType: MIME_BY_EXT[match[2]],
    };
}

function responseHeaders(contentType: string) {
    return new Headers({
        'content-type': contentType,
        'cache-control': 'public, max-age=31536000, immutable',
        'accept-ranges': 'bytes',
    });
}

function arrayBufferBody(bytes: Uint8Array) {
    const buffer = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(buffer).set(bytes);
    return buffer;
}

async function proxyS3Object(key: string, contentType: string, request: Request, head = false) {
    try {
        if (head) {
            const object = await headUploadObject(key);
            const headers = responseHeaders(object.contentType ?? contentType);
            if (object.contentLength !== null) headers.set('content-length', String(object.contentLength));
            if (object.cacheControl) headers.set('cache-control', object.cacheControl);
            if (object.etag) headers.set('etag', object.etag);
            if (object.lastModified) headers.set('last-modified', object.lastModified);
            return new Response(null, { status: object.status, headers });
        }

        const object = await readUploadObject(key, request.headers.get('range'));
        const headers = responseHeaders(object.contentType ?? contentType);
        headers.set('content-length', String(object.body.byteLength));
        if (object.contentRange) headers.set('content-range', object.contentRange);
        if (object.cacheControl) headers.set('cache-control', object.cacheControl);
        if (object.acceptRanges) headers.set('accept-ranges', object.acceptRanges);
        if (object.etag) headers.set('etag', object.etag);
        if (object.lastModified) headers.set('last-modified', object.lastModified);
        return new Response(arrayBufferBody(object.body), { status: object.status, headers });
    } catch {
        return new Response('Not found', { status: 404 });
    }
}

async function handleAvatar(params: UploadParams, request: Request, head = false) {
    const parsed = parseRequest(params);
    if (!parsed) {
        return new Response('Not found', { status: 404 });
    }

    try {
        const buf = await readFile(
            join(process.cwd(), 'uploads', 'avatars', params.file),
        );
        const headers = responseHeaders(parsed.contentType);
        headers.set('content-length', String(buf.byteLength));
        return new Response(head ? null : new Uint8Array(buf), { headers });
    } catch {
        if (storageDriver === 's3') return proxyS3Object(parsed.key, parsed.contentType, request, head);
        return new Response('Not found', { status: 404 });
    }
}

export const Route = createFileRoute('/uploads/avatars/$file')({
    server: {
        handlers: {
            GET: async ({ params, request }) => handleAvatar(params, request),
            HEAD: async ({ params, request }) => handleAvatar(params, request, true),
        },
    },
});
