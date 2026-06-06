import 'server-only';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises';
import { join, dirname } from 'node:path';

/**
 * Backend-agnostic object storage for private documents.
 *
 * - **Any S3-compatible provider** when configured (Cloudflare R2, Supabase Storage, Backblaze
 *   B2, iDrive e2, MinIO, AWS S3…): objects are private; downloads go through short-lived
 *   presigned URLs (PRD §5.9 — never a public URL).
 *     - Generic: `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`,
 *       `S3_BUCKET`, optional `S3_FORCE_PATH_STYLE` (default true).
 *     - Cloudflare R2 shortcut: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`,
 *       `R2_BUCKET` (endpoint derived automatically).
 * - **Local disk** otherwise (keyless dev): files live under `.voyageos/documents/`, served only
 *   through the authenticated `/api/documents/[id]` route (no signing, but never public).
 *
 * Only the object KEY is ever stored on a document; the key never reaches the client.
 */

interface S3Config {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  forcePathStyle: boolean;
}

/** Resolves an S3-compatible config from env, or null to fall back to local disk. */
function resolveS3(): S3Config | null {
  const e = process.env;
  if (e.S3_ENDPOINT && e.S3_ACCESS_KEY_ID && e.S3_SECRET_ACCESS_KEY && e.S3_BUCKET) {
    return {
      endpoint: e.S3_ENDPOINT,
      region: e.S3_REGION || 'auto',
      accessKeyId: e.S3_ACCESS_KEY_ID,
      secretAccessKey: e.S3_SECRET_ACCESS_KEY,
      bucket: e.S3_BUCKET,
      // Most non-AWS providers (Supabase, MinIO…) need path-style addressing.
      forcePathStyle: e.S3_FORCE_PATH_STYLE !== 'false',
    };
  }
  if (e.R2_ACCOUNT_ID && e.R2_ACCESS_KEY_ID && e.R2_SECRET_ACCESS_KEY && e.R2_BUCKET) {
    return {
      endpoint: `https://${e.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      region: 'auto',
      accessKeyId: e.R2_ACCESS_KEY_ID,
      secretAccessKey: e.R2_SECRET_ACCESS_KEY,
      bucket: e.R2_BUCKET,
      forcePathStyle: false,
    };
  }
  return null;
}

const S3 = resolveS3();

export function isRemoteStorage(): boolean {
  return S3 !== null;
}

const LOCAL_ROOT = join(process.cwd(), '.voyageos', 'documents');

/** Builds a collision-free, scoped object key. */
export function buildStorageKey(userId: string, tripId: string, fileName: string): string {
  const ext = fileName.includes('.') ? fileName.slice(fileName.lastIndexOf('.')).toLowerCase() : '';
  const safeExt = /^\.[a-z0-9]{1,8}$/.test(ext) ? ext : '';
  return `${userId}/${tripId}/${randomUUID()}${safeExt}`;
}

// --- S3 client (lazy-loaded so local dev never imports the AWS SDK) ---

async function s3() {
  const cfg = S3!;
  const { S3Client } = await import('@aws-sdk/client-s3');
  return new S3Client({
    region: cfg.region,
    endpoint: cfg.endpoint,
    forcePathStyle: cfg.forcePathStyle,
    credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
  });
}

export async function putObject(key: string, body: Buffer, contentType: string): Promise<void> {
  if (S3) {
    const { PutObjectCommand } = await import('@aws-sdk/client-s3');
    const client = await s3();
    await client.send(
      new PutObjectCommand({ Bucket: S3.bucket, Key: key, Body: body, ContentType: contentType }),
    );
    return;
  }
  const path = join(LOCAL_ROOT, key);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, body);
}

export async function deleteObject(key: string): Promise<void> {
  if (S3) {
    const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
    const client = await s3();
    await client.send(new DeleteObjectCommand({ Bucket: S3.bucket, Key: key }));
    return;
  }
  try {
    await unlink(join(LOCAL_ROOT, key));
  } catch {
    // already gone — fine
  }
}

/** Reads object bytes (used by the local download route; remote prefers signed URLs). */
export async function getObjectBytes(key: string): Promise<Buffer | null> {
  if (S3) {
    const { GetObjectCommand } = await import('@aws-sdk/client-s3');
    const client = await s3();
    const res = await client.send(new GetObjectCommand({ Bucket: S3.bucket, Key: key }));
    const bytes = await res.Body?.transformToByteArray();
    return bytes ? Buffer.from(bytes) : null;
  }
  try {
    return await readFile(join(LOCAL_ROOT, key));
  } catch {
    return null;
  }
}

/**
 * Short-lived presigned GET URL (remote only). Returns null for local storage, where the route
 * streams bytes instead. `download` forces an attachment disposition.
 */
export async function getSignedDownloadUrl(
  key: string,
  fileName: string,
  opts: { download?: boolean; expiresSeconds?: number } = {},
): Promise<string | null> {
  if (!S3) return null;
  const { GetObjectCommand } = await import('@aws-sdk/client-s3');
  const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
  const disposition = `${opts.download ? 'attachment' : 'inline'}; filename="${fileName.replace(/"/g, '')}"`;
  const command = new GetObjectCommand({
    Bucket: S3.bucket,
    Key: key,
    ResponseContentDisposition: disposition,
  });
  return getSignedUrl(await s3(), command, { expiresIn: opts.expiresSeconds ?? 300 });
}
