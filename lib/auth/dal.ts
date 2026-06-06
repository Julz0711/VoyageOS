import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';

/**
 * Data Access Layer for auth (per the Next 16 auth guide). Every server action, route handler,
 * and data fetch must call `requireSession()` so no query ever runs without a session user.
 * `cache` memoizes within a single render pass.
 */

export const getSession = cache(async () => auth());

export interface SessionUser {
  userId: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

/** Returns the session user, or redirects to /login if unauthenticated. */
export const requireSession = cache(async (): Promise<SessionUser> => {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect('/login');
  }
  return {
    userId: session.user.id,
    name: session.user.name,
    email: session.user.email,
    image: session.user.image,
  };
});

/** Returns the session user id or null without redirecting. */
export const getOptionalUserId = cache(async (): Promise<string | null> => {
  const session = await getSession();
  return session?.user?.id ?? null;
});
