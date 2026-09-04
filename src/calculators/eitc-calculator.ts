/**
 * Earned Income Tax Credit (EITC) precise calculation.
 * Source: IRS Rev. Proc. 2023-34 (TY2024), Rev. Proc. 2024-40 (TY2025)
 */

import type { FilingStatus } from "../data/tax-brackets.js";

interface EITCParams {
  creditRate: number;
  earnedIncomeThreshold: number;
  maxCredit: number;
  phaseoutRate: number;
  phaseoutStart: number;
  phaseoutStartMFJ: number;
  completionThreshold: number;
  completionThresholdMFJ: number;
}

// TY2024 EITC parameters by number of qualifying children
const EITC_2024: Record<number, EITCParams> = {
  0: { creditRate: 0.0765, earnedIncomeThreshold: 8260, maxCredit: 632, phaseoutRate: 0.0765, phaseoutStart: 10330, phaseoutStartMFJ: 17250, completionThreshold: 18591, completionThresholdMFJ: 25511 },
  1: { creditRate: 0.34, earnedIncomeThreshold: 12390, maxCredit: 4213, phaseoutRate: 0.1598, phaseoutStart: 22720, phaseoutStartMFJ: 29640, completionThreshold: 49084, completionThresholdMFJ: 56004 },
  2: { creditRate: 0.40, earnedIncomeThreshold: 17400, maxCredit: 6960, phaseoutRate: 0.2106, phaseoutStart: 22720, phaseoutStartMFJ: 29640, completionThreshold: 55768, completionThresholdMFJ: 62688 },
  3: { creditRate: 0.45, earnedIncomeThreshold: 17400, maxCredit: 7830, phaseoutRate: 0.2106, phaseoutStart: 22720, phaseoutStartMFJ: 29640, completionThreshold: 59899, completionThresholdMFJ: 66819 },
};

const EITC_2025: Record<number, EITCParams> = {
  0: { creditRate: 0.0765, earnedIncomeThreshold: 8490, maxCredit: 649, phaseoutRate: 0.0765, phaseoutStart: 10620, phaseoutStartMFJ: 17730, completionThreshold: 19104, completionThresholdMFJ: 26214 },
  1: { creditRate: 0.34, earnedIncomeThreshold: 12730, maxCredit: 4328, phaseoutRate: 0.1598, phaseoutStart: 23350, phaseoutStartMFJ: 30470, completionThreshold: 50434, completionThresholdMFJ: 57554 },
  2: { creditRate: 0.40, earnedIncomeThreshold: 17880, maxCredit: 7152, phaseoutRate: 0.2106, phaseoutStart: 23350, phaseoutStartMFJ: 30470, completionThreshold: 57310, completionThresholdMFJ: 64430 },
  3: { creditRate: 0.45, earnedIncomeThreshold: 17880, maxCredit: 8046, phaseoutRate: 0.2106, phaseoutStart: 23350, phaseoutStartMFJ: 30470, completionThreshold: 61555, completionThresholdMFJ: 68675 },
};

const EITC_DATA: Record<number, Record<number, EITCParams>> = {
  2024: EITC_2024,
  2025: EITC_2025,
};

// Investment income limit
const INVESTMENT_INCOME_LIMIT: Record<number, number> = {
  2024: 11600,
  2025: 11950,
};

export interface EITCInput {
  taxYear: number;
  filingStatus: FilingStatus;
  earnedIncome: number;
  agi: number;
  qualifyingChildren: number;
  investmentIncome?: number;
}

export interface EITCResult {
  eligible: boolean;
  credit: number;
  maxPossibleCredit: number;
  phase: "phase-in" | "plateau" | "phase-out" | "ineligible";
  reason?: string;
  qualifyingChildren: number;
  incomeLimit: number;
}

export function calculateEITC(input: EITCInput): EITCResult {
  const yearData = EITC_DATA[input.taxYear];
  if (!yearData) {
    return { eligible: false, credit: 0, maxPossibleCredit: 0, phase: "ineligible", reason: `TY${input.taxYear} not supported`, qualifyingChildren: 0, incomeLimit: 0 };
  }

  // MFS not eligible
  if (input.filingStatus === "married_filing_separately") {
    return { eligible: false, credit: 0, maxPossibleCredit: 0, phase: "ineligible", reason: "Married filing separately cannot claim EITC", qualifyingChildren: 0, incomeLimit: 0 };
  }

  // Investment income check
  const investLimit = INVESTMENT_INCOME_LIMIT[input.taxYear] ?? 11600;
  if ((input.investmentIncome ?? 0) > investLimit) {
    return { eligible: false, credit: 0, maxPossibleCredit: 0, phase: "ineligible", reason: `Investment income exceeds $${investLimit.toLocaleString()} limit`, qualifyingChildren: input.qualifyingChildren, incomeLimit: 0 };
  }

  const children = Math.min(input.qualifyingChildren, 3); // max 3 for EITC
  const params = yearData[children];
  if (!params) {
    return { eligible: false, credit: 0, maxPossibleCredit: 0, phase: "ineligible", reason: "Invalid parameters", qualifyingChildren: children, incomeLimit: 0 };
  }

  const isMFJ = input.filingStatus === "married_filing_jointly";
  const phaseoutStart = isMFJ ? params.phaseoutStartMFJ : params.phaseoutStart;
  const incomeLimit = isMFJ
    ? params.completionThresholdMFJ
    : params.completionThreshold;

  // Use the greater of earned income or AGI for phase-out
  const phaseoutIncome = Math.max(input.earnedIncome, input.agi);

  let credit: number;
  let phase: "phase-in" | "plateau" | "phase-out" | "ineligible";

  if (input.earnedIncome <= 0) {
    credit = 0;
    phase = "ineligible";
  } else if (input.earnedIncome <= params.earnedIncomeThreshold) {
    // Phase-in: credit increases with income
    credit = input.earnedIncome * params.creditRate;
    phase = "phase-in";
  } else if (phaseoutIncome <= phaseoutStart) {
    // Plateau: max credit
    credit = params.maxCredit;
    phase = "plateau";
  } else if (phaseoutIncome < incomeLimit) {
    // Phase-out: credit decreases
    credit = params.maxCredit - (phaseoutIncome - phaseoutStart) * params.phaseoutRate;
    phase = "phase-out";
  } else {
    credit = 0;
    phase = "ineligible";
  }

  credit = Math.max(0, Math.round(credit));

  return {
    eligible: credit > 0,
    credit,
    maxPossibleCredit: params.maxCredit,
    phase,
    qualifyingChildren: children,
    incomeLimit,
  };
}
