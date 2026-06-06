import 'server-only';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

/**
 * AES-256-GCM encryption for BYOK keys at rest. Output is base64 of [iv(12) | tag(16) | ct].
 * The key comes from BYOK_ENCRYPTION_KEY; in dev a deterministic fallback is derived so the
 * app runs keyless. Never log plaintext keys or the encryption key.
 */
function getKey(): Buffer {
  const raw = process.env.BYOK_ENCRYPTION_KEY;
  if (!raw) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('BYOK_ENCRYPTION_KEY is required in production to store API keys.');
    }
    // Dev-only deterministic fallback (not secret). Real deployments must set the env var.
    return createHash('sha256').update('voyageos-dev-byok-key').digest();
  }
  // Accept any string; hash to a stable 32-byte key.
  return createHash('sha256').update(raw).digest();
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getKey(), iv);
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ct]).toString('base64');
}

export function decryptSecret(payload: string): string {
  const buf = Buffer.from(payload, 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ct = buf.subarray(28);
  const decipher = createDecipheriv('aes-256-gcm', getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
}
