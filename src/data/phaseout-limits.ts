/**
 * Indexed income limits used by eligibility screens.
 *
 * Student loan interest (IRC 221(b)(2)(B)):
 *   TY2024: Rev. Proc. 2023-34 sec. 3.30
 *   TY2025: Rev. Proc. 2024-40 sec. 3.30
 *   TY2026: Rev. Proc. 2025-32 sec. 3.29
 * Saver's Credit upper AGI limit (IRC 25B(b)(1)(C) and (D)):
 *   TY2024: Notice 2023-75; TY2025: Notice 2024-80; TY2026: Notice 2025-67
 */

import type { FilingStatus } from "./tax-brackets.js";

interface PhaseoutRange {
  start: number;
  end: number;
}

interface YearLimits {
  studentLoanInterest: { other: PhaseoutRange; joint: PhaseoutRange };
  saversCredit: { other: number; headOfHousehold: number; joint: number };
}

const LIMITS: Record<number, YearLimits> = {
  2024: {
    studentLoanInterest: { other: { start: 80000, end: 95000 }, joint: { start: 165000, end: 195000 } },
    saversCredit: { other: 38250, headOfHousehold: 57375, joint: 76500 },
  },
  2025: {
    studentLoanInterest: { other: { start: 85000, end: 100000 }, joint: { start: 170000, end: 200000 } },
    saversCredit: { other: 39500, headOfHousehold: 59250, joint: 79000 },
  },
  2026: {
    studentLoanInterest: { other: { start: 85000, end: 100000 }, joint: { start: 175000, end: 205000 } },
    saversCredit: { other: 40250, headOfHousehold: 60375, joint: 80500 },
  },
};

function getYearLimits(taxYear: number): YearLimits {
  const limits = LIMITS[taxYear];
  if (!limits) {
    throw new Error(`Income limits for TY${taxYear} are not supported. Supported years: 2024, 2025, 2026`);
  }
  return limits;
}

/** MAGI phase-out range; null when the deduction is unavailable (MFS, IRC 221(e)(2)). */
export function getStudentLoanInterestPhaseout(taxYear: number, filingStatus: FilingStatus): PhaseoutRange | null {
  const { studentLoanInterest } = getYearLimits(taxYear);
  if (filingStatus === "married_filing_separately") return null;
  return filingStatus === "married_filing_jointly" ? studentLoanInterest.joint : studentLoanInterest.other;
}

/** Highest AGI that still allows the 10% Saver's Credit rate. */
export function getSaversCreditAgiLimit(taxYear: number, filingStatus: FilingStatus): number {
  const { saversCredit } = getYearLimits(taxYear);
  if (filingStatus === "married_filing_jointly") return saversCredit.joint;
  if (filingStatus === "head_of_household") return saversCredit.headOfHousehold;
  return saversCredit.other;
}
