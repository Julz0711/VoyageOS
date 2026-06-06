import { describe, it, expect } from 'vitest';
import { tripCountdown, tripDayCount, formatDateRange } from './dates';

describe('tripCountdown', () => {
  const now = new Date('2026-06-05T12:00:00Z');

  it('reports days to go for an upcoming trip', () => {
    const c = tripCountdown('2026-06-08', '2026-06-12', now);
    expect(c.state).toBe('upcoming');
    expect(c.label).toBe('3 days to go');
  });

  it('reports day-of for an active trip', () => {
    const c = tripCountdown('2026-06-04', '2026-06-10', now);
    expect(c.state).toBe('active');
    expect(c.label).toBe('Day 2 of 7');
  });

  it('reports past trips', () => {
    const c = tripCountdown('2026-05-01', '2026-05-10', now);
    expect(c.state).toBe('past');
  });
});

describe('tripDayCount', () => {
  it('is inclusive of both endpoints', () => {
    expect(tripDayCount('2026-07-10', '2026-07-20')).toBe(11);
  });
});

describe('formatDateRange', () => {
  it('collapses a same-month range', () => {
    expect(formatDateRange('2026-07-10', '2026-07-20')).toBe('10–20 Jul 2026');
  });
});
