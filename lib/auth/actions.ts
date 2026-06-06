'use server';

import { signIn, signOut } from '@/lib/auth/config';

export async function signInDev(): Promise<void> {
  await signIn('dev', { redirectTo: '/dashboard' });
}

export async function signInGoogle(): Promise<void> {
  await signIn('google', { redirectTo: '/dashboard' });
}

export async function signInDiscord(): Promise<void> {
  await signIn('discord', { redirectTo: '/dashboard' });
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: '/login' });
}
