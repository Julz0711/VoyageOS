import { redirect } from 'next/navigation';
import { getOptionalUserId } from '@/lib/auth/dal';
import { signInDev, signInGoogle, signInDiscord } from '@/lib/auth/actions';
import { strings } from '@/lib/strings';
import { Button } from '@/components/ui/button';
import { LogoMark } from '@/components/brand/Logo';
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

      <div className="border-border bg-surface shadow-lift w-full max-w-sm rounded-lg border p-8">
        <div className="mb-8 text-center">
          <LogoMark className="mx-auto mb-4 size-12" />
          <h1 className="font-display text-ink text-3xl font-semibold">
            Voyage<span className="text-muted">OS</span>
          </h1>
          <p className="eyebrow text-muted mt-2">{strings.tagline}</p>
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
            <p className="text-danger text-center text-sm">No sign-in method configured.</p>
          )}
        </div>

        {devAvailable && (
          <p className="border-border text-muted mt-6 border-t pt-4 text-center font-sans text-[11px] leading-relaxed">
            Dev sign-in runs without keys. Set Google or Discord OAuth env vars for real sign-in.
          </p>
        )}
      </div>
    </div>
  );
}
