import { requireSession } from '@/lib/auth/dal';
import { getAiInfo } from '@/lib/ai/userSettings';
import { getOpenRouterFreeModels } from '@/lib/ai/openrouter';
import { signOutAction } from '@/lib/auth/actions';
import { ByokForm } from '@/components/settings/ByokForm';
import { Button } from '@/components/ui/button';
import { strings } from '@/lib/strings';

export const metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const { userId, email } = await requireSession();
  const [info, openRouterModels] = await Promise.all([getAiInfo(userId), getOpenRouterFreeModels()]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="eyebrow mb-1 text-muted">Settings</p>
        <h1 className="font-display text-3xl font-semibold text-ink">AI assistant</h1>
        <p className="mt-1 text-sm text-muted">
          The assistant runs on your own API key — add one to start chatting (free-tier providers
          work too, but can run into issues when performing complex tasks. high-tier providers are providing bettter results). Keys are encrypted at rest and used only on the server to call your provider,
          never exposed to your browser.
        </p>
      </div>

      <ByokForm info={info} openRouterModels={openRouterModels} />

      {/* Account */}
      <div className="space-y-3 border-t border-border pt-6">
        <p className="eyebrow text-muted">Account</p>
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface p-4">
          <span className="min-w-0">
            <span className="block text-sm font-medium text-ink">Signed in</span>
            {email && <span className="block truncate font-mono text-xs text-muted">{email}</span>}
          </span>
          <form action={signOutAction}>
            <Button type="submit" variant="secondary" size="sm">
              {strings.auth.signOut}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
