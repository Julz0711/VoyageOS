import { describe, it, expect } from 'vitest';
import { encryptSecret, decryptSecret } from './crypto';

describe('BYOK encryption', () => {
  it('round-trips a secret', () => {
    const secret = 'sk-test-abc123-XYZ';
    const enc = encryptSecret(secret);
    expect(enc).not.toContain(secret);
    expect(decryptSecret(enc)).toBe(secret);
  });

  it('produces different ciphertext each time (random IV)', () => {
    const a = encryptSecret('same');
    const b = encryptSecret('same');
    expect(a).not.toBe(b);
    expect(decryptSecret(a)).toBe('same');
    expect(decryptSecret(b)).toBe('same');
  });

  it('fails to decrypt tampered payload', () => {
    const enc = encryptSecret('secret');
    const tampered = `${enc.slice(0, -2)}xx`;
    expect(() => decryptSecret(tampered)).toThrow();
  });
});
