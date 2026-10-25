export type AllowancePlan = {
  monthlyCapMinor: number;
  baseMinor: number;
  currency: string;
  completionThresholdPercent: number;
  dailyBonusMinor: number;
  showPoints: boolean;
  allowPositivePoints: boolean;
  allowNegativePoints: boolean;
};

export type RoutineCompletion = {
  id: string;
  weight: number;
  completed: boolean;
  exempt?: boolean;
};

export type DailyBonusAssessment = {
  eligibleWeight: number;
  completedWeight: number;
  completionPercent: number;
  qualified: boolean;
  bonusMinor: number;
};

/** Pure preview calculation. Server-side approval and ledger remain authoritative. */
export function assessDailyBonus(plan: AllowancePlan, routines: RoutineCompletion[]): DailyBonusAssessment {
  if (!Number.isInteger(plan.completionThresholdPercent) || plan.completionThresholdPercent < 0 || plan.completionThresholdPercent > 100) {
    throw new RangeError('Completion threshold must be between 0 and 100.');
  }
  if (![plan.monthlyCapMinor, plan.baseMinor, plan.dailyBonusMinor].every(n => Number.isSafeInteger(n) && n >= 0) || plan.baseMinor > plan.monthlyCapMinor) {
    throw new RangeError('Amounts must be nonnegative integer minor units within the monthly cap.');
  }
  if (routines.some(r => !Number.isSafeInteger(r.weight) || r.weight <= 0)) {
    throw new RangeError('Routine weights must be positive integers.');
  }
  const eligible = routines.filter(r => !r.exempt);
  const eligibleWeight = eligible.reduce((sum, r) => sum + r.weight, 0);
  const completedWeight = eligible.filter(r => r.completed).reduce((sum, r) => sum + r.weight, 0);
  const completionPercent = eligibleWeight ? completedWeight / eligibleWeight * 100 : 0;
  const qualified = eligibleWeight > 0 && completionPercent >= plan.completionThresholdPercent;
  return { eligibleWeight, completedWeight, completionPercent, qualified, bonusMinor: qualified ? plan.dailyBonusMinor : 0 };
}

/** Cap the proposed credit without changing previously earned money. */
export function cappedCredit(plan: AllowancePlan, earnedMinor: number, proposedMinor: number): number {
  if (![earnedMinor, proposedMinor].every(n => Number.isSafeInteger(n) && n >= 0)) throw new RangeError('Credits must be nonnegative integer minor units.');
  return Math.min(proposedMinor, Math.max(0, plan.monthlyCapMinor - Math.max(plan.baseMinor, earnedMinor)));
}
