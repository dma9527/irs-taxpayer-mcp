/**
 * Retirement and HSA contribution limits by tax year.
 *
 * Sources:
 *   TY2024: Notice 2023-75, Rev. Proc. 2023-23
 *   TY2025: Notice 2024-80, Rev. Proc. 2024-25
 *   TY2026: Notice 2025-67 (IR-2025-111), Rev. Proc. 2025-19
 */

export interface ContributionLimits {
  electiveDeferral: number;
  catchUp50: number;
  /** SECURE 2.0 higher catch-up for ages 60 through 63; equals catchUp50 before TY2025. */
  catchUp60To63: number;
  definedContributionTotal: number;
  ira: number;
  iraCatchUp50: number;
  hsaSelfOnly: number;
  hsaFamily: number;
  hsaCatchUp55: number;
}

const CONTRIBUTION_LIMITS: Record<number, ContributionLimits> = {
  2024: {
    electiveDeferral: 23000,
    catchUp50: 7500,
    catchUp60To63: 7500,
    definedContributionTotal: 69000,
    ira: 7000,
    iraCatchUp50: 1000,
    hsaSelfOnly: 4150,
    hsaFamily: 8300,
    hsaCatchUp55: 1000,
  },
  2025: {
    electiveDeferral: 23500,
    catchUp50: 7500,
    catchUp60To63: 11250,
    definedContributionTotal: 70000,
    ira: 7000,
    iraCatchUp50: 1000,
    hsaSelfOnly: 4300,
    hsaFamily: 8550,
    hsaCatchUp55: 1000,
  },
  2026: {
    electiveDeferral: 24500,
    catchUp50: 8000,
    catchUp60To63: 11250,
    definedContributionTotal: 72000,
    ira: 7500,
    iraCatchUp50: 1100,
    hsaSelfOnly: 4400,
    hsaFamily: 8750,
    hsaCatchUp55: 1000,
  },
};

export function getContributionLimits(taxYear: number): ContributionLimits {
  const limits = CONTRIBUTION_LIMITS[taxYear];
  if (!limits) {
    throw new Error(`Contribution limits for TY${taxYear} are not supported. Supported years: 2024, 2025, 2026`);
  }
  return limits;
}

/** Self-employed SEP limit: plan rate 25% equals 20% of net earnings after the half SE tax deduction (Pub. 560). */
export function calculateSelfEmployedSepLimit(
  netProfit: number,
  halfSelfEmploymentTax: number,
  taxYear: number,
): number {
  const netEarnings = Math.max(0, netProfit - halfSelfEmploymentTax);
  return Math.min(
    Math.round(netEarnings * 0.20),
    getContributionLimits(taxYear).definedContributionTotal,
  );
}
