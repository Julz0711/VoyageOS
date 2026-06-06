'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { connectToDatabase } from '@/lib/db/connect';
import { requireSession } from '@/lib/auth/dal';
import { User } from '@/models/User';
import { encryptSecret } from '@/lib/crypto';
import { providers, type ProviderId } from '@/config/ai';

const saveSchema = z.object({
  provider: z.string().refine((p) => p in providers, 'Unknown provider'),
  model: z.string().min(1),
  key: z.string().trim().min(8, 'That key looks too short'),
});

export type SaveKeyState = { error?: string; ok?: boolean } | undefined;

export async function saveByokKey(_prev: SaveKeyState, formData: FormData): Promise<SaveKeyState> {
  const { userId } = await requireSession();

  const parsed = saveSchema.safeParse({
    provider: formData.get('provider'),
    model: formData.get('model'),
    key: formData.get('key'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };

  const providerId = parsed.data.provider as ProviderId;
  const cfg = providers[providerId];
  if (!cfg.byok) return { error: 'This provider does not accept a key' };

  const key = parsed.data.key;
  const hint = `····${key.slice(-4)}`;

  await connectToDatabase();
  const res = await User.updateOne(
    { _id: userId },
    {
      $set: {
        aiActive: 'byok',
        aiProvider: providerId,
        aiModel: parsed.data.model,
        byokKeyEnc: encryptSecret(key),
        byokKeyHint: hint,
      },
    },
  );

  // No user document matched the session id — usually a stale session after a DB reset.
  if (res.matchedCount === 0) {
    return {
      error: 'Your session is out of sync with the database. Please sign out and sign in again, then re-add your key.',
    };
  }

  revalidatePath('/settings');
  revalidatePath('/chat');
  return { ok: true };
}

export async function clearByokKey(): Promise<void> {
  const { userId } = await requireSession();
  await connectToDatabase();
  await User.updateOne(
    { _id: userId },
    { $unset: { aiActive: '', aiProvider: '', aiModel: '', byokKeyEnc: '', byokKeyHint: '' } },
  );
  revalidatePath('/settings');
  revalidatePath('/chat');
}

/** Toggle AI usage / rate-limit warnings shown in chat. */
export async function setAiWarnings(enabled: boolean): Promise<void> {
  const { userId } = await requireSession();
  await connectToDatabase();
  await User.updateOne({ _id: userId }, { $set: { aiWarnings: enabled } });
  revalidatePath('/settings');
  revalidatePath('/chat');
}

/** Change the model for the user's saved BYOK provider (validated against that provider). */
export async function setAiModel(modelId: string): Promise<void> {
  const { userId } = await requireSession();
  await connectToDatabase();
  const user = await User.findById(userId).select('aiProvider byokKeyEnc').lean();
  if (!user?.aiProvider || !user?.byokKeyEnc) return; // no saved key → nothing to set

  const cfg = providers[user.aiProvider as ProviderId];
  if (!cfg) return;
  // Dynamic-model providers (OpenRouter) accept any non-empty id; others must match the list.
  const valid = cfg.dynamicModels ? modelId.length > 0 : cfg.models.some((m) => m.id === modelId);
  if (!valid) return;

  await User.updateOne({ _id: userId }, { $set: { aiModel: modelId } });
  revalidatePath('/settings');
  revalidatePath('/chat');
}
