import { requireSession } from '@/lib/auth/dal';
import { getTrips, getActiveTrip } from '@/lib/trips/queries';
import { seedTripForUser } from '@/lib/seed';
import { Sidebar } from '@/components/app-shell/Sidebar';
import { ContextBar } from '@/components/app-shell/ContextBar';
import { BottomNav } from '@/components/app-shell/TabNav';
import { AtlasTexture } from '@/components/app-shell/AtlasTexture';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await requireSession();

  // First-run: give a brand-new user a starter trip so there's data to explore.
  await seedTripForUser(userId);

  const [trips, activeTrip] = await Promise.all([getTrips(userId), getActiveTrip(userId)]);

  return (
    <div className="min-h-dvh md:flex">
      <AtlasTexture />
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <ContextBar trips={trips} activeTrip={activeTrip} />
        <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10 pb-[calc(7rem+env(safe-area-inset-bottom))] md:px-12 md:py-12 md:pb-16">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
