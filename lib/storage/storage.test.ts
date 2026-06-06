import { describe, it, expect, afterEach } from 'vitest';
import {
  buildStorageKey,
  isRemoteStorage,
  putObject,
  getObjectBytes,
  deleteObject,
  getSignedDownloadUrl,
} from './index';
import { isAllowedDocumentMime, formatBytes } from '@/config/documents';

describe('storage (local backend)', () => {
  const keys: string[] = [];
  afterEach(async () => {
    await Promise.all(keys.splice(0).map((k) => deleteObject(k)));
  });

  it('uses local storage when no R2 env is set', () => {
    expect(isRemoteStorage()).toBe(false);
  });

  it('builds a scoped, extension-preserving key', () => {
    const key = buildStorageKey('user1', 'trip1', 'My Ticket.PDF');
    expect(key).toMatch(/^user1\/trip1\/[0-9a-f-]+\.pdf$/);
  });

  it('round-trips put → get → delete', async () => {
    const key = buildStorageKey('u', 't', 'note.txt');
    keys.push(key);
    await putObject(key, Buffer.from('hello docs'), 'text/plain');

    const bytes = await getObjectBytes(key);
    expect(bytes?.toString()).toBe('hello docs');

    await deleteObject(key);
    expect(await getObjectBytes(key)).toBeNull();
    keys.pop();
  });

  it('has no signed URL in local mode (served via the route instead)', async () => {
    expect(await getSignedDownloadUrl('any/key', 'f.pdf')).toBeNull();
  });
});

describe('document validation', () => {
  it('allows PDFs and images only', () => {
    expect(isAllowedDocumentMime('application/pdf')).toBe(true);
    expect(isAllowedDocumentMime('image/png')).toBe(true);
    expect(isAllowedDocumentMime('application/x-msdownload')).toBe(false);
    expect(isAllowedDocumentMime('text/html')).toBe(false);
  });

  it('formats sizes', () => {
    expect(formatBytes(500)).toBe('500 B');
    expect(formatBytes(2048)).toBe('2 KB');
    expect(formatBytes(3 * 1024 * 1024)).toBe('3.0 MB');
  });
});
