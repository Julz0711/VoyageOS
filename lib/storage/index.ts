import 'server-only';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises';
import { join, dirname } from 'node:path';

/**
 * Backend-agnostic object storage for private documents.
 *
 * - **R2/S3** when all `R2_*` env vars are set: objects are private; downloads go through
 *   short-lived presigned URLs (PRD §5.9 — never a public URL).
 * - **Local disk** otherwise (keyless dev): files live under `.voyageos/documents/`, served
 *   only through the authenticated `/api/documents/[id]` route (no signing, but never public).
 *
 * Only the object KEY is ever stored on a document; the key never reaches the client.
 */

const R2 = {
  accountId: process.env.R2_ACCOUNT_ID,
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  bucket: process.env.R2_BUCKET,
};

export function isRemoteStorage(): boolean {
  return Boolean(R2.accountId && R2.accessKeyId && R2.secretAccessKey && R2.bucket);
}

const LOCAL_ROOT = join(process.cwd(), '.voyageos', 'documents');

/** Builds a collision-free, scoped object key. */
export function buildStorageKey(userId: string, tripId: string, fileName: string): string {
  const ext = fileName.includes('.') ? fileName.slice(fileName.lastIndexOf('.')).toLowerCase() : '';
  const safeExt = /^\.[a-z0-9]{1,8}$/.test(ext) ? ext : '';
  return `${userId}/${tripId}/${randomUUID()}${safeExt}`;
}

// --- S3/R2 client (lazy-loaded so local dev never imports the AWS SDK) ---

async function s3() {
  const { S3Client } = await import('@aws-sdk/client-s3');
  return new S3Client({
    region: 'auto',
    endpoint: `https://${R2.accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2.accessKeyId!, secretAccessKey: R2.secretAccessKey! },
  });
}

export async function putObject(key: string, body: Buffer, contentType: string): Promise<void> {
  if (isRemoteStorage()) {
    const { PutObjectCommand } = await import('@aws-sdk/client-s3');
    const client = await s3();
    await client.send(
      new PutObjectCommand({ Bucket: R2.bucket!, Key: key, Body: body, ContentType: contentType }),
    );
    return;
  }
  const path = join(LOCAL_ROOT, key);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, body);
}

export async function deleteObject(key: string): Promise<void> {
  if (isRemoteStorage()) {
    const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
    const client = await s3();
    await client.send(new DeleteObjectCommand({ Bucket: R2.bucket!, Key: key }));
    return;
  }
  try {
    await unlink(join(LOCAL_ROOT, key));
  } catch {
    // already gone — fine
  }
}

/** Reads object bytes (used by the local download route; R2 prefers signed URLs). */
export async function getObjectBytes(key: string): Promise<Buffer | null> {
  if (isRemoteStorage()) {
    const { GetObjectCommand } = await import('@aws-sdk/client-s3');
    const client = await s3();
    const res = await client.send(new GetObjectCommand({ Bucket: R2.bucket!, Key: key }));
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
 * Short-lived presigned GET URL (R2 only). Returns null for local storage, where the route
 * streams bytes instead. `download` forces an attachment disposition.
 */
export async function getSignedDownloadUrl(
  key: string,
  fileName: string,
  opts: { download?: boolean; expiresSeconds?: number } = {},
): Promise<string | null> {
  if (!isRemoteStorage()) return null;
  const { GetObjectCommand } = await import('@aws-sdk/client-s3');
  const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
  const disposition = `${opts.download ? 'attachment' : 'inline'}; filename="${fileName.replace(/"/g, '')}"`;
  const command = new GetObjectCommand({
    Bucket: R2.bucket!,
    Key: key,
    ResponseContentDisposition: disposition,
  });
  return getSignedUrl(await s3(), command, { expiresIn: opts.expiresSeconds ?? 300 });
}
