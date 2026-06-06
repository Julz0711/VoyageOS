import { redirect } from 'next/navigation';
import { Compass } from 'lucide-react';
import { getOptionalUserId } from '@/lib/auth/dal';
import { signInDev, signInGoogle, signInDiscord } from '@/lib/auth/actions';
import { strings } from '@/lib/strings';
import { Button } from '@/components/ui/button';
import { AtlasTexture } from '@/components/app-shell/AtlasTexture';

export default async function LoginPage() {
  const userId = await getOptionalUserId();
  if (userId) redirect('/dashboard');

  const googleConfigured = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
  const discordConfigured = Boolean(process.env.AUTH_DISCORD_ID && process.env.AUTH_DISCORD_SECRET);
  const devAvailable = process.env.NODE_ENV !== 'production';
  const anyOAuth = googleConfigured || discordConfigured;

  return (
    <div className="relative flex min-h-dvh items-center justify-center px-4">
      <AtlasTexture />

      <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-8 shadow-lift">
        <div className="mb-8 text-center">
          <span className="mx-auto mb-4 flex size-12 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Compass className="size-6" aria-hidden />
          </span>
          <h1 className="font-display text-3xl font-semibold text-ink">
            Voyage<span className="text-muted">OS</span>
          </h1>
          <p className="eyebrow mt-2 text-muted">{strings.tagline}</p>
        </div>

        <div className="space-y-3">
          {googleConfigured && (
            <form action={signInGoogle}>
              <Button type="submit" variant="primary" size="lg" className="w-full">
                {strings.auth.google}
              </Button>
            </form>
          )}

          {discordConfigured && (
            <form action={signInDiscord}>
              <Button
                type="submit"
                variant={googleConfigured ? 'secondary' : 'primary'}
                size="lg"
                className="w-full"
              >
                {strings.auth.discord}
              </Button>
            </form>
          )}

          {devAvailable && (
            <form action={signInDev}>
              <Button
                type="submit"
                variant={anyOAuth ? 'secondary' : 'primary'}
                size="lg"
                className="w-full"
              >
                {strings.auth.devContinue}
              </Button>
            </form>
          )}

          {!anyOAuth && !devAvailable && (
            <p className="text-center text-sm text-danger">No sign-in method configured.</p>
          )}
        </div>

        {devAvailable && (
          <p className="mt-6 border-t border-border pt-4 text-center font-mono text-[11px] leading-relaxed text-muted">
            Dev sign-in runs without keys. Set Google or Discord OAuth env vars for real sign-in.
          </p>
        )}
      </div>
    </div>
  );
}
