import 'server-only';
import { connectToDatabase } from '@/lib/db/connect';
import { User, type IUser } from '@/models/User';
import { getModel } from '@/lib/ai/provider';

/** AI fields needed to resolve a model (server-side only). */
export async function getAiUser(
  userId: string,
): Promise<Pick<IUser, 'aiActive' | 'aiProvider' | 'aiModel' | 'byokKeyEnc'>> {
  await connectToDatabase();
  const user = await User.findById(userId).select('aiActive aiProvider aiModel byokKeyEnc').lean();
  return {
    aiActive: user?.aiActive,
    aiProvider: user?.aiProvider,
    aiModel: user?.aiModel,
    byokKeyEnc: user?.byokKeyEnc,
  };
}

export interface AiInfo {
  available: boolean;
  byok: boolean;
  providerId: string;
  modelId: string;
  providerLabel: string;
  keyHint?: string;
  /** Whether a BYOK key is saved. */
  hasKey: boolean;
  /** Provider of the saved BYOK key, if any. */
  byokProviderId?: string;
  /** Selected model id for the saved key (for the model picker). */
  byokModelId?: string;
}

/** Display info for the chat header / settings page — never includes the key itself. */
export async function getAiInfo(userId: string): Promise<AiInfo> {
  await connectToDatabase();
  const user = await User.findById(userId)
    .select('aiActive aiProvider aiModel byokKeyEnc byokKeyHint')
    .lean();
  const resolved = getModel({
    aiActive: user?.aiActive,
    aiProvider: user?.aiProvider,
    aiModel: user?.aiModel,
    byokKeyEnc: user?.byokKeyEnc,
  });
  const hasKey = Boolean(user?.byokKeyEnc && user?.aiProvider);
  return {
    available: resolved.available,
    byok: resolved.byok,
    providerId: resolved.providerId,
    modelId: resolved.modelId,
    providerLabel: resolved.providerLabel,
    keyHint: user?.byokKeyHint,
    hasKey,
    byokProviderId: user?.aiProvider,
    byokModelId: user?.aiModel,
  };
}
