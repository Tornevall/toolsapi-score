import { describe, expect, it } from 'vitest';
import { assessDailyBonus, cappedCredit, type AllowancePlan } from './allowance';

const plan: AllowancePlan = {
  monthlyCapMinor: 125000, baseMinor: 0, currency: 'SEK',
  completionThresholdPercent: 80, dailyBonusMinor: 2500,
  showPoints: false, allowPositivePoints: false, allowNegativePoints: false
};

describe('allowance calculation', () => {
  it('awards a full daily bonus at the configured weighted threshold', () => {
    expect(assessDailyBonus(plan, [
      { id: 'a', weight: 4, completed: true },
      { id: 'b', weight: 1, completed: false }
    ])).toMatchObject({ completionPercent: 80, qualified: true, bonusMinor: 2500 });
  });
  it('does not count exempt routines or award bonuses for empty schedules', () => {
    expect(assessDailyBonus(plan, [{ id: 'a', weight: 1, completed: false, exempt: true }]).qualified).toBe(false);
    expect(assessDailyBonus(plan, []).bonusMinor).toBe(0);
  });
  it('does not reduce earned money for incomplete days', () => {
    expect(assessDailyBonus(plan, [{ id: 'a', weight: 1, completed: false }]).bonusMinor).toBe(0);
    expect(cappedCredit(plan, 10000, 0)).toBe(0);
  });
  it('caps credits at the remaining monthly allowance', () => {
    expect(cappedCredit(plan, 124000, 2500)).toBe(1000);
    expect(cappedCredit({ ...plan, baseMinor: 50000 }, 0, 2500)).toBe(2500);
    expect(cappedCredit(plan, 125000, 2500)).toBe(0);
  });
  it('rejects invalid percentages and money values', () => {
    expect(() => assessDailyBonus({ ...plan, completionThresholdPercent: 101 }, [])).toThrow(RangeError);
    expect(() => cappedCredit(plan, -1, 100)).toThrow(RangeError);
  });
});
