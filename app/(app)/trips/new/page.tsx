import { requireSession } from '@/lib/auth/dal';
import { strings } from '@/lib/strings';
import { Card, CardContent } from '@/components/ui/card';
import { TripForm } from '@/components/trips/TripForm';

export const metadata = { title: 'New trip' };

export default async function NewTripPage() {
  await requireSession();
  return (
    <div className="mx-auto max-w-lg">
      <p className="eyebrow mb-1 text-muted">Plot a course</p>
      <h1 className="mb-5 font-display text-3xl font-semibold">{strings.trips.newTrip}</h1>
      <Card>
        <CardContent>
          <TripForm />
        </CardContent>
      </Card>
    </div>
  );
}
