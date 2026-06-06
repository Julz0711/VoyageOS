import { differenceInCalendarDays, format, eachDayOfInterval } from 'date-fns';

/** "10–20 Jul 2026" (or with months/years when they differ). */
export function formatDateRange(startISO: string, endISO: string): string {
  const start = new Date(startISO);
  const end = new Date(endISO);
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  const sameYear = start.getFullYear() === end.getFullYear();

  if (sameMonth) return `${format(start, 'd')}–${format(end, 'd MMM yyyy')}`;
  if (sameYear) return `${format(start, 'd MMM')} – ${format(end, 'd MMM yyyy')}`;
  return `${format(start, 'd MMM yyyy')} – ${format(end, 'd MMM yyyy')}`;
}

export interface Countdown {
  label: string;
  /** 'upcoming' | 'active' | 'past' */
  state: 'upcoming' | 'active' | 'past';
  days: number;
}

export function tripCountdown(startISO: string, endISO: string, now: Date = new Date()): Countdown {
  const start = new Date(startISO);
  const end = new Date(endISO);
  const toStart = differenceInCalendarDays(start, now);
  const toEnd = differenceInCalendarDays(end, now);

  if (toStart > 0) {
    return { label: toStart === 1 ? '1 day to go' : `${toStart} days to go`, state: 'upcoming', days: toStart };
  }
  if (toEnd >= 0) {
    const total = differenceInCalendarDays(end, start) + 1;
    const dayNum = differenceInCalendarDays(now, start) + 1;
    return { label: `Day ${dayNum} of ${total}`, state: 'active', days: toEnd };
  }
  return { label: 'Past trip', state: 'past', days: toEnd };
}

/** Number of days the trip spans, inclusive. */
export function tripDayCount(startISO: string, endISO: string): number {
  return differenceInCalendarDays(new Date(endISO), new Date(startISO)) + 1;
}

/** Each day in the trip range, inclusive. */
export function tripDays(startISO: string, endISO: string): Date[] {
  return eachDayOfInterval({ start: new Date(startISO), end: new Date(endISO) });
}
