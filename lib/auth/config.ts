import NextAuth, { type NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import Discord from 'next-auth/providers/discord';
import { connectToDatabase } from '@/lib/db/connect';
import { User } from '@/models/User';

const DEV_USER = {
  email: 'dev@voyageos.local',
  name: 'Dev Traveller',
} as const;

const googleConfigured = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
const discordConfigured = Boolean(process.env.AUTH_DISCORD_ID && process.env.AUTH_DISCORD_SECRET);
const isProd = process.env.NODE_ENV === 'production';

/** Ensures a User document exists for the given email and returns its id. */
async function upsertUser(email: string, name?: string, image?: string): Promise<string> {
  await connectToDatabase();
  const user = await User.findOneAndUpdate(
    { email: email.toLowerCase() },
    { $setOnInsert: { email: email.toLowerCase() }, ...(name ? { name } : {}), ...(image ? { image } : {}) },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
  );
  if (!user) throw new Error('Failed to upsert user');
  return user._id.toString();
}

const providers: NextAuthConfig['providers'] = [];

// Keyless dev sign-in: "Continue as dev user". Available outside production.
if (!isProd) {
  providers.push(
    Credentials({
      id: 'dev',
      name: 'Dev user',
      credentials: {},
      async authorize() {
        const id = await upsertUser(DEV_USER.email, DEV_USER.name);
        return { id, email: DEV_USER.email, name: DEV_USER.name };
      },
    }),
  );
}

// Real OAuth sign-in activates only when each provider's credentials are configured.
if (googleConfigured) {
  providers.push(Google);
}
if (discordConfigured) {
  providers.push(Discord);
}

const config: NextAuthConfig = {
  providers,
  trustHost: true,
  // Dev-insecure fallback keeps the app keyless locally; set AUTH_SECRET in real deployments.
  secret: process.env.AUTH_SECRET ?? (isProd ? undefined : 'dev-insecure-secret-change-me'),
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  callbacks: {
    async jwt({ token, user }) {
      // On Google sign-in, ensure a User doc exists and pin our id onto the token.
      if (user) {
        if (user.id && !user.email?.endsWith('@voyageos.local')) {
          token.id = await upsertUser(user.email!, user.name ?? undefined, user.image ?? undefined);
        } else if (user.id) {
          token.id = user.id;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.id && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(config);
