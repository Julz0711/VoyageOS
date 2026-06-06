import { requireActiveTrip } from '@/lib/trips/active';
import { getExpenses } from '@/lib/budget/queries';
import { BudgetView } from '@/components/budget/BudgetView';
import { NoActiveTrip } from '@/components/NoActiveTrip';

export const metadata = { title: 'Budget' };

export default async function BudgetPage() {
  const { userId, trip } = await requireActiveTrip();
  if (!trip) return <NoActiveTrip />;

  const expenses = await getExpenses(userId, trip.id);
  return <BudgetView trip={trip} expenses={expenses} />;
}
