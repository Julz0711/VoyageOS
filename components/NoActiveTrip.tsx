import Link from 'next/link';
import { strings } from '@/lib/strings';

export function NoActiveTrip() {
  return (
    <div className="rounded-lg border border-dashed border-border bg-surface/50 px-6 py-16 text-center text-muted">
      {strings.trips.none}.{' '}
      <Link href="/trips/new" className="font-medium text-ink underline">
        {strings.trips.create}
      </Link>{' '}
      to get started.
    </div>
  );
}
