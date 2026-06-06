import { describe, it, expect } from 'vitest';
import { buildIcs } from './ics';
import { formatMoney } from '@/config/expenses';

const NOW = new Date('2026-06-01T10:00:00Z');

describe('buildIcs', () => {
  it('wraps events in a VCALENDAR with CRLF lines', () => {
    const ics = buildIcs('Lisbon', [{ id: 'a', date: '2026-07-01', title: 'Arrive' }], NOW);
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics).toContain('END:VCALENDAR');
    expect(ics).toContain('X-WR-CALNAME:Lisbon');
    expect(ics.split('\r\n').filter((l) => l === 'BEGIN:VEVENT')).toHaveLength(1);
  });

  it('emits all-day events with an exclusive next-day DTEND', () => {
    const ics = buildIcs('T', [{ id: 'a', date: '2026-07-01', title: 'Beach' }], NOW);
    expect(ics).toContain('DTSTART;VALUE=DATE:20260701');
    expect(ics).toContain('DTEND;VALUE=DATE:20260702');
  });

  it('emits timed events from startTime + duration', () => {
    const ics = buildIcs('T', [{ id: 'b', date: '2026-07-01', title: 'Tour', startTime: '14:30', durationMinutes: 90 }], NOW);
    expect(ics).toContain('DTSTART:20260701T143000');
    expect(ics).toContain('DTEND:20260701T160000');
  });

  it('escapes special characters in titles', () => {
    const ics = buildIcs('T', [{ id: 'c', date: '2026-07-01', title: 'Dinner; wine, cheese' }], NOW);
    expect(ics).toContain('SUMMARY:Dinner\\; wine\\, cheese');
  });
});

describe('formatMoney', () => {
  it('formats with the given currency', () => {
    expect(formatMoney(12.5, 'EUR')).toMatch(/12[.,]50/);
    expect(formatMoney(1000, 'USD')).toMatch(/1,000|1\.000/);
  });

  it('falls back gracefully for unknown currency codes', () => {
    expect(formatMoney(5, 'ZZZ')).toContain('ZZZ');
  });
});
