import { describe, it, expect } from 'vitest';
import { seedPackingItems, seasonForDate } from './packing';

describe('seedPackingItems', () => {
  it('always includes base essentials', () => {
    const labels = seedPackingItems([], 'summer').map((s) => s.label);
    expect(labels).toContain('Passport / ID');
  });

  it('adds activity gear for the trip categories', () => {
    const labels = seedPackingItems(['hike', 'swim'], 'summer').map((s) => s.label);
    expect(labels).toContain('Hiking boots');
    expect(labels).toContain('Swimwear');
  });

  it('does not duplicate items', () => {
    const seeds = seedPackingItems(['hike', 'hike'], 'summer');
    const keys = seeds.map((s) => `${s.group}::${s.label}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('seasonForDate', () => {
  it('maps July to summer', () => {
    expect(seasonForDate(new Date('2026-07-15'))).toBe('summer');
  });
  it('maps January to winter', () => {
    expect(seasonForDate(new Date('2026-01-15'))).toBe('winter');
  });
});
