/**
 * Premium Tax Credit (IRC 36B, Form 8962) annual estimate for TY2026.
 *
 * Sources:
 *   Applicable Percentage Table: Rev. Proc. 2025-25 section 3.01
 *   Federal poverty line: HHS 2025 poverty guidelines for the 48 states and DC, Alaska, and Hawaii (prior-year guidelines apply, Form 8962 line 4)
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
  /** Form 1095-A lines 21 to 32 for part-year or changing coverage; replaces the annual totals. */
  monthly?: MonthlyPolicyAmounts[];
  /** Exception 2: MFS victim of domestic abuse or spousal abandonment who checks the Form 8962 box. */
  marriedFilingSeparatelyException2?: boolean;
  /** Below-100% exception: the Marketplace estimated at least 100% at enrollment (no intentional disregard). */
  marketplaceEstimatedAtLeast100Percent?: boolean;
}

export interface MonthlyPolicyAmounts {
  enrollmentPremium: number;
  benchmarkPremium: number;
  advancePayment: number;
}

export interface PremiumTaxCreditResult {
  eligible: boolean;
  reason?: string;
  povertyLine: number;
  povertyLinePercent: number;
  applicableFigure: number;
  annualContribution: number;
  /** Form 8962 line 8b; zero in annual mode. */
  monthlyContribution: number;
  advancePayments: number;
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

// HHS 2025 poverty guidelines, 90 FR 5917 (January 17, 2025).
const POVERTY_LINES_2025: Record<PovertyLineRegion, { first: number; additional: number }> = {
  contiguous: { first: 15650, additional: 5500 },
  alaska: { first: 19550, additional: 6880 },
  hawaii: { first: 17990, additional: 6330 },
};

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
  if (!Number.isInteger(input.familySize) || input.familySize < 1) {
    throw new Error("familySize must be a positive integer.");
  }
  if (input.monthly && input.monthly.length !== 12) {
    throw new Error("Monthly amounts must list all 12 months, January through December, with zeros for months without coverage.");
  }
  const sum = (pick: (month: MonthlyPolicyAmounts) => number) =>
    (input.monthly ?? []).reduce((total, month) => total + pick(month), 0);
  const advancePayments = input.monthly ? sum((month) => month.advancePayment) : input.advancePayments;

  const povertyLineTable = POVERTY_LINES_2025[input.povertyLineRegion ?? "contiguous"];
  const povertyLine = povertyLineTable.first
    + povertyLineTable.additional * (input.familySize - 1);
  // Form 8962 Worksheet 2: multiply by 100 and drop decimals; do not round.
  const povertyLinePercent = Math.floor((input.householdIncome / povertyLine) * 100);
  const ineligible = (reason: string): PremiumTaxCreditResult => ({
    eligible: false,
    reason,
    povertyLine,
    povertyLinePercent,
    applicableFigure: 0,
    annualContribution: 0,
    monthlyContribution: 0,
    advancePayments,
    premiumTaxCredit: 0,
    netPremiumTaxCredit: 0,
    excessAdvanceRepayment: Math.max(0, advancePayments),
  });
  if (input.filingStatus === "married_filing_separately" && !input.marriedFilingSeparatelyException2) {
    return ineligible("Married filing separately is not an applicable taxpayer unless Exception 2 (domestic abuse or spousal abandonment) applies. This assumes the policy covered only your tax family; a policy shared with your spouse's tax family repays half.");
  }
  const belowPovertyException = input.marketplaceEstimatedAtLeast100Percent === true && advancePayments > 0;
  if (povertyLinePercent < 100 && !belowPovertyException) {
    return ineligible("Household income is below 100% of the poverty line. The exception requires a Marketplace estimate of at least 100% at enrollment and APTC paid for at least one month.");
  }
  if (povertyLinePercent > 400) {
    return ineligible("Household income is above 400% of the poverty line, so no Premium Tax Credit is allowed for TY2026.");
  }

  const figure = applicableFigure(povertyLinePercent);
  const annualContribution = Math.round(input.householdIncome * figure);
  let premiumTaxCredit: number;
  let monthlyContribution = 0;
  if (input.monthly) {
    monthlyContribution = Math.round(annualContribution / 12);
    premiumTaxCredit = sum((month) => Math.min(
      month.enrollmentPremium,
      Math.max(0, month.benchmarkPremium - monthlyContribution),
    ));
  } else {
    premiumTaxCredit = Math.max(0, Math.min(
      input.annualEnrollmentPremium,
      input.annualBenchmarkPremium - annualContribution,
    ));
  }
  return {
    eligible: premiumTaxCredit > 0,
    povertyLine,
    povertyLinePercent,
    applicableFigure: figure,
    annualContribution,
    monthlyContribution,
    advancePayments,
    premiumTaxCredit,
    netPremiumTaxCredit: Math.max(0, premiumTaxCredit - advancePayments),
    // TY2026: excess advance payments are repaid in full (no IRC 36B(f)(2)(B) cap).
    excessAdvanceRepayment: Math.max(0, advancePayments - premiumTaxCredit),
  };
}
