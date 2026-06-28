import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { S3Client } from '@aws-sdk/client-s3';

import { uploadPathForKey } from '@/lib/upload-url';

export type StorageSubdir = 'posters' | 'avatars' | 'chat';

const s3Configured = Boolean(
    process.env.S3_BUCKET &&
    process.env.S3_ENDPOINT &&
    process.env.S3_ACCESS_KEY_ID &&
    process.env.S3_SECRET_ACCESS_KEY,
);

/** 'local' = files on disk (served by /uploads route); 's3' = S3-compatible object storage */
export const storageDriver: 'local' | 's3' = s3Configured ? 's3' : 'local';

let client: S3Client | null = null;
async function getClient(): Promise<S3Client> {
    if (!client) {
        const { S3Client: Ctor } = await import('@aws-sdk/client-s3');
        client = new Ctor({
            region: process.env.S3_REGION || 'ru-1',
            endpoint: process.env.S3_ENDPOINT,
            forcePathStyle: true,
            credentials: {
                accessKeyId: process.env.S3_ACCESS_KEY_ID!,
                secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
            },
        });
    }
    return client;
}

function publicUrl(key: string) {
    const base = (process.env.S3_PUBLIC_URL || `${process.env.S3_ENDPOINT}/${process.env.S3_BUCKET}`)
        .replace(/\/+$/, '');
    return `${base}/${key}`;
}

export function publicUploadUrl(key: string) {
    return publicUrl(key.replace(/^\/+/, ''));
}

export async function readUploadObject(key: string, range: string | null) {
    const s3 = await getClient();
    const { GetObjectCommand } = await import('@aws-sdk/client-s3');
    const response = await s3.send(new GetObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: key.replace(/^\/+/, ''),
        Range: range ?? undefined,
    }));
    const body = response.Body
        ? await response.Body.transformToByteArray()
        : new Uint8Array();

    return {
        body,
        status: response.$metadata.httpStatusCode ?? (range ? 206 : 200),
        contentType: response.ContentType ?? null,
        contentLength: response.ContentLength ?? body.byteLength,
        cacheControl: response.CacheControl ?? null,
        acceptRanges: response.AcceptRanges ?? null,
        contentRange: response.ContentRange ?? null,
        etag: response.ETag ?? null,
        lastModified: response.LastModified?.toUTCString() ?? null,
    };
}

export async function headUploadObject(key: string) {
    const s3 = await getClient();
    const { HeadObjectCommand } = await import('@aws-sdk/client-s3');
    const response = await s3.send(new HeadObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: key.replace(/^\/+/, ''),
    }));

    return {
        status: response.$metadata.httpStatusCode ?? 200,
        contentType: response.ContentType ?? null,
        contentLength: response.ContentLength ?? null,
        cacheControl: response.CacheControl ?? null,
        etag: response.ETag ?? null,
        lastModified: response.LastModified?.toUTCString() ?? null,
    };
}

/**
 * Persist an uploaded file and return the URL to reference it by.
 * - s3:    uploads to the bucket and returns same-origin /uploads URL (served via proxy)
 * - local: writes to ./uploads/<subdir> and returns /uploads/<subdir>/<name>
 */
export async function storeUpload(
    subdir: StorageSubdir,
    ext: string,
    bytes: Buffer,
    contentType: string,
): Promise<{ url: string }> {
    const name = `${randomBytes(12).toString('hex')}.${ext}`;

    if (s3Configured) {
        const key = `${subdir}/${name}`;
        const s3 = await getClient();
        const { PutObjectCommand } = await import('@aws-sdk/client-s3');
        await s3.send(new PutObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: key,
            Body: bytes,
            ContentType: contentType,
            ACL: 'public-read',
            CacheControl: 'public, max-age=31536000, immutable',
        }));
        return { url: uploadPathForKey(key) };
    }

    const dir = join(process.cwd(), 'uploads', subdir);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, name), bytes);
    return { url: `/uploads/${subdir}/${name}` };
}
