/**
 * Minimal iCalendar (RFC 5545) generation — pure and dependency-free so it's easy to test.
 * Entries without a start time become all-day events; timed entries use floating local time.
 */

export interface IcsEntry {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  startTime?: string; // "HH:mm"
  durationMinutes?: number;
}

/** Escapes text per RFC 5545 (commas, semicolons, backslashes, newlines). */
function esc(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function dateCompact(ymd: string): string {
  return ymd.replace(/-/g, '');
}

function addMinutes(ymd: string, hhmm: string, minutes: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const [hh, mm] = hhmm.split(':').map(Number);
  const dt = new Date(y, m - 1, d, hh, mm + minutes);
  return (
    `${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(dt.getDate())}T${pad(dt.getHours())}${pad(dt.getMinutes())}00`
  );
}

function stamp(now: Date): string {
  return (
    `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T` +
    `${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`
  );
}

export function buildIcs(calendarName: string, entries: IcsEntry[], now: Date = new Date()): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//VoyageOS//Trip Planner//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${esc(calendarName)}`,
  ];

  const dtstamp = stamp(now);
  for (const e of entries) {
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${e.id}@voyageos`);
    lines.push(`DTSTAMP:${dtstamp}`);
    if (e.startTime) {
      lines.push(`DTSTART:${dateCompact(e.date)}T${e.startTime.replace(':', '')}00`);
      lines.push(`DTEND:${addMinutes(e.date, e.startTime, e.durationMinutes && e.durationMinutes > 0 ? e.durationMinutes : 60)}`);
    } else {
      // All-day: DTEND is the next day (exclusive end).
      const [y, m, d] = e.date.split('-').map(Number);
      const end = new Date(y, m - 1, d + 1);
      lines.push(`DTSTART;VALUE=DATE:${dateCompact(e.date)}`);
      lines.push(`DTEND;VALUE=DATE:${end.getFullYear()}${pad(end.getMonth() + 1)}${pad(end.getDate())}`);
    }
    lines.push(`SUMMARY:${esc(e.title)}`);
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}
