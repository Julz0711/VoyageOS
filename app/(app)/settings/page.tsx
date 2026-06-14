import Link from 'next/link';
import { requireSession } from '@/lib/auth/dal';
import { getAiInfo } from '@/lib/ai/userSettings';
import { getOpenRouterFreeModels } from '@/lib/ai/openrouter';
import { signOutAction } from '@/lib/auth/actions';
import { ByokForm } from '@/components/settings/ByokForm';
import { DeleteAccountButton } from '@/components/settings/DeleteAccountButton';
import { Button } from '@/components/ui/button';
import { strings } from '@/lib/strings';

export const metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const { userId, email } = await requireSession();
  const [info, openRouterModels] = await Promise.all([
    getAiInfo(userId),
    getOpenRouterFreeModels(),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="eyebrow text-muted mb-1">Settings</p>
        <h1 className="font-display text-ink text-3xl font-semibold">AI assistant</h1>
        <p className="text-muted mt-1 text-sm">
          The assistant runs on your own API key — add one to start chatting. Free-tier providers
          work, though they can struggle with complex tasks; higher-tier models give better results.
          Keys are encrypted at rest and used only on the server to call your provider, never exposed
          to your browser.
        </p>
      </div>

      <ByokForm info={info} openRouterModels={openRouterModels} />

      <div className="border-border space-y-3 border-t pt-6">
        <p className="eyebrow text-muted">Account</p>
        <div className="border-border bg-surface flex items-center justify-between gap-3 rounded-lg border p-4">
          <span className="min-w-0">
            <span className="text-ink block text-sm font-medium">Signed in</span>
            {email && <span className="text-muted block truncate font-sans text-xs">{email}</span>}
          </span>
          <form action={signOutAction}>
            <Button type="submit" variant="secondary" size="sm">
              {strings.auth.signOut}
            </Button>
          </form>
        </div>

        <div className="border-border bg-surface flex items-center justify-between gap-3 rounded-lg border p-4">
          <span className="min-w-0">
            <span className="text-ink block text-sm font-medium">Delete account</span>
            <span className="text-muted block text-xs">
              Permanently removes all your data — trips, photos, documents, and your account.
            </span>
          </span>
          <DeleteAccountButton />
        </div>
      </div>

      <div className="border-border border-t pt-4">
        <p className="text-muted text-xs">
          By using VoyageOS you agree to our{' '}
          <Link href="/privacy" className="text-ink underline underline-offset-2">
            Privacy Policy
          </Link>
          . Your data is encrypted in transit and at rest and never shared with third parties.
        </p>
      </div>
    </div>
  );
}
