/**
 * Premium Tax Credit (IRC 36B, Form 8962) annual estimate for TY2026.
 *
 * Sources:
 *   Applicable Percentage Table: Rev. Proc. 2025-25 section 3.01
 *   Federal poverty line: HHS 2025 poverty guidelines (prior-year guidelines apply, Form 8962 line 4)
 *   Repayment caps removed for tax years beginning after 2025: Public Law 119-21
 */

import type { FilingStatus } from "../data/tax-brackets.js";

export type PovertyLineRegion = "contiguous" | "alaska" | "hawaii";

export interface PremiumTaxCreditInput {
  taxYear: number;
  filingStatus: FilingStatus;
  /** Form 8962 line 3: modified AGI of the taxpayer and dependents required to file. */
  householdIncome: number;
  familySize: number;
  /** Form 1095-A column A total for the year. */
  annualEnrollmentPremium: number;
  /** Form 1095-A column B total: second lowest cost silver plan premium. */
  annualBenchmarkPremium: number;
  /** Form 1095-A column C total. */
  advancePayments: number;
  povertyLineRegion?: PovertyLineRegion;
}

export interface PremiumTaxCreditResult {
  eligible: boolean;
  reason?: string;
  povertyLine: number;
  povertyLinePercent: number;
  applicableFigure: number;
  annualContribution: number;
  premiumTaxCredit: number;
  netPremiumTaxCredit: number;
  excessAdvanceRepayment: number;
}

interface ApplicablePercentageBand {
  lowPercent: number;
  highPercent: number;
  initial: number;
  final: number;
}

const APPLICABLE_PERCENTAGE_2026: ApplicablePercentageBand[] = [
  { lowPercent: 0, highPercent: 133, initial: 0.021, final: 0.021 },
  { lowPercent: 133, highPercent: 150, initial: 0.0314, final: 0.0419 },
  { lowPercent: 150, highPercent: 200, initial: 0.0419, final: 0.066 },
  { lowPercent: 200, highPercent: 250, initial: 0.066, final: 0.0844 },
  { lowPercent: 250, highPercent: 300, initial: 0.0844, final: 0.0996 },
  { lowPercent: 300, highPercent: 400, initial: 0.0996, final: 0.0996 },
];

const POVERTY_LINE_2025_CONTIGUOUS = { first: 15650, additional: 5500 };

function applicableFigure(povertyLinePercent: number): number {
  const band = APPLICABLE_PERCENTAGE_2026.find(({ lowPercent, highPercent }) =>
    povertyLinePercent >= lowPercent && povertyLinePercent < highPercent)
    ?? APPLICABLE_PERCENTAGE_2026[APPLICABLE_PERCENTAGE_2026.length - 1];
  const share = (povertyLinePercent - band.lowPercent) / (band.highPercent - band.lowPercent);
  // Form 8962 Table 2 lists applicable figures to four decimal places.
  return Math.round((band.initial + (band.final - band.initial) * share) * 10000) / 10000;
}

export function calculatePremiumTaxCredit(input: PremiumTaxCreditInput): PremiumTaxCreditResult {
  if (input.taxYear !== 2026) {
    throw new Error(`Premium Tax Credit for TY${input.taxYear} is not supported. Only TY2026 is modeled.`);
  }
  const region = input.povertyLineRegion ?? "contiguous";
  if (region !== "contiguous") {
    throw new Error(`${region === "alaska" ? "Alaska" : "Hawaii"} poverty lines are not modeled.`);
  }
  if (input.filingStatus === "married_filing_separately") {
    throw new Error("The Premium Tax Credit for married filing separately requires an exception that is not modeled.");
  }
  if (!Number.isInteger(input.familySize) || input.familySize < 1) {
    throw new Error("familySize must be a positive integer.");
  }

  const povertyLine = POVERTY_LINE_2025_CONTIGUOUS.first
    + POVERTY_LINE_2025_CONTIGUOUS.additional * (input.familySize - 1);
  // Form 8962 Worksheet 2: multiply by 100 and drop decimals; do not round.
  const povertyLinePercent = Math.floor((input.householdIncome / povertyLine) * 100);
  const ineligible = (reason: string): PremiumTaxCreditResult => ({
    eligible: false,
    reason,
    povertyLine,
    povertyLinePercent,
    applicableFigure: 0,
    annualContribution: 0,
    premiumTaxCredit: 0,
    netPremiumTaxCredit: 0,
    excessAdvanceRepayment: Math.max(0, input.advancePayments),
  });
  if (povertyLinePercent < 100) {
    return ineligible("Household income is below 100% of the poverty line; the APTC exception for estimated income is not modeled.");
  }
  if (povertyLinePercent > 400) {
    return ineligible("Household income is above 400% of the poverty line, so no Premium Tax Credit is allowed for TY2026.");
  }

  const figure = applicableFigure(povertyLinePercent);
  const annualContribution = Math.round(input.householdIncome * figure);
  const premiumTaxCredit = Math.max(0, Math.min(
    input.annualEnrollmentPremium,
    input.annualBenchmarkPremium - annualContribution,
  ));
  return {
    eligible: premiumTaxCredit > 0,
    povertyLine,
    povertyLinePercent,
    applicableFigure: figure,
    annualContribution,
    premiumTaxCredit,
    netPremiumTaxCredit: Math.max(0, premiumTaxCredit - input.advancePayments),
    // TY2026: excess advance payments are repaid in full (no IRC 36B(f)(2)(B) cap).
    excessAdvanceRepayment: Math.max(0, input.advancePayments - premiumTaxCredit),
  };
}
