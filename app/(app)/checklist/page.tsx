import { requireActiveTrip } from '@/lib/trips/active';
import { getChecklist } from '@/lib/checklist/queries';
import { ChecklistView } from '@/components/checklist/ChecklistView';
import { NoActiveTrip } from '@/components/NoActiveTrip';

export const metadata = { title: 'Checklist' };

export default async function ChecklistPage() {
  const { userId, trip } = await requireActiveTrip();
  if (!trip) return <NoActiveTrip />;

  const items = await getChecklist(userId, trip.id);
  return <ChecklistView trip={trip} items={items} />;
}
