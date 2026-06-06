import { describe, it, expect } from 'vitest';
import { wmoInfo, isWetCode } from './wmo';

describe('wmoInfo', () => {
  it('labels clear and rainy codes', () => {
    expect(wmoInfo(0).label).toBe('Clear');
    expect(wmoInfo(63).label).toBe('Rain');
  });

  it('falls back for unknown codes', () => {
    expect(wmoInfo(1234).label).toBe('Unknown');
  });
});

describe('isWetCode', () => {
  it('treats drizzle and worse as wet', () => {
    expect(isWetCode(51)).toBe(true);
    expect(isWetCode(95)).toBe(true);
  });
  it('treats clear/cloud/fog as dry', () => {
    expect(isWetCode(0)).toBe(false);
    expect(isWetCode(3)).toBe(false);
    expect(isWetCode(48)).toBe(false);
  });
});
