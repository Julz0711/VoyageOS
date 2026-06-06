import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getModel } from './provider';
import { encryptSecret } from '@/lib/crypto';

describe('getModel (BYOK-only)', () => {
  const orig = { ...process.env };
  beforeEach(() => {
    delete process.env.GROQ_API_KEY;
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  });
  afterEach(() => {
    process.env = { ...orig };
  });

  it('is unavailable when no key is saved', () => {
    const r = getModel({});
    expect(r.available).toBe(false);
    expect(r.model).toBeNull();
  });

  it('ignores app-owned server keys entirely (no fallback)', () => {
    process.env.GROQ_API_KEY = 'gsk_server';
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'gemini_server';
    const r = getModel({});
    expect(r.available).toBe(false);
    expect(r.model).toBeNull();
  });

  it('uses a saved BYOK key', () => {
    const r = getModel({
      aiProvider: 'anthropic',
      aiModel: 'claude-sonnet-4-6',
      byokKeyEnc: encryptSecret('sk-ant-byok'),
    });
    expect(r.available).toBe(true);
    expect(r.byok).toBe(true);
    expect(r.providerId).toBe('anthropic');
  });

  it('honors the BYOK provider and selected model', () => {
    const r = getModel({
      aiProvider: 'openai',
      aiModel: 'gpt-4o-mini',
      byokKeyEnc: encryptSecret('sk-openai'),
    });
    expect(r.byok).toBe(true);
    expect(r.providerId).toBe('openai');
    expect(r.modelId).toBe('gpt-4o-mini');
  });

  it('supports free-tier providers as BYOK (e.g. Groq, Mistral)', () => {
    const groq = getModel({
      aiProvider: 'groq',
      aiModel: 'llama-3.3-70b-versatile',
      byokKeyEnc: encryptSecret('gsk-user'),
    });
    expect(groq.available).toBe(true);
    expect(groq.providerId).toBe('groq');

    const mistral = getModel({
      aiProvider: 'mistral',
      aiModel: 'mistral-small-latest',
      byokKeyEnc: encryptSecret('mistral-key'),
    });
    expect(mistral.available).toBe(true);
    expect(mistral.providerId).toBe('mistral');
  });
});
