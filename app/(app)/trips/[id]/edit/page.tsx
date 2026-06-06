import { notFound } from 'next/navigation';
import { requireSession } from '@/lib/auth/dal';
import { getTripById } from '@/lib/trips/queries';
import { Card, CardContent } from '@/components/ui/card';
import { TripForm } from '@/components/trips/TripForm';

export const metadata = { title: 'Edit trip' };

export default async function EditTripPage({ params }: { params: Promise<{ id: string }> }) {
  const { userId } = await requireSession();
  const { id } = await params;
  const trip = await getTripById(userId, id);
  if (!trip) notFound();

  return (
    <div className="mx-auto max-w-lg">
      <p className="eyebrow mb-1 text-muted">Adjust the plan</p>
      <h1 className="mb-5 font-display text-3xl font-semibold">Edit trip</h1>
      <Card>
        <CardContent>
          <TripForm trip={trip} />
        </CardContent>
      </Card>
    </div>
  );
}
