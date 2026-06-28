const FALLBACK_S3_PUBLIC_BASES = [
    'https://s3.twcstorage.ru/ay-s3storage-01',
];

function getProcessEnv() {
    return typeof process !== 'undefined' ? process.env : {};
}

function s3PublicBases() {
    const env = getProcessEnv();
    return [
        env.S3_PUBLIC_URL,
        env.S3_ENDPOINT && env.S3_BUCKET
            ? `${env.S3_ENDPOINT}/${env.S3_BUCKET}`
            : null,
        ...FALLBACK_S3_PUBLIC_BASES,
    ]
        .filter((base): base is string => Boolean(base))
        .map((base) => base.replace(/\/+$/, ''));
}

export function uploadPathForKey(key: string) {
    return `/uploads/${key.replace(/^\/+/, '')}`;
}

export function toServedUploadUrl(url: string | null | undefined): string | null {
    const value = url?.trim();
    if (!value) return null;
    if (value.startsWith('/uploads/')) return value;

    const withoutQuery = value.split('?')[0] ?? value;
    for (const base of s3PublicBases()) {
        if (withoutQuery.startsWith(`${base}/`)) {
            const key = withoutQuery.slice(base.length + 1);
            if (/^posters\//.test(key)) return uploadPathForKey(key);
        }
    }

    return value;
}
