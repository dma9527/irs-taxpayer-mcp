/**
 * Federal income tax brackets and standard deductions for TY2024 and TY2025.
 * Source: IRS Revenue Procedure 2023-34 (TY2024), Revenue Procedure 2024-40 (TY2025)
 */

export type FilingStatus =
  | "single"
  | "married_filing_jointly"
  | "married_filing_separately"
  | "head_of_household";

export interface TaxBracket {
  min: number;
  max: number | null; // null = no upper limit
  rate: number;
}

export interface TaxYearData {
  year: number;
  brackets: Record<FilingStatus, TaxBracket[]>;
  standardDeduction: Record<FilingStatus, number>;
  additionalDeduction: {
    age65OrBlind: Record<FilingStatus, number>;
  };
  qualifiedBusinessIncomeDeductionRate: number;
  capitalGainsBrackets: Record<FilingStatus, { rate: number; threshold: number }[]>;
  socialSecurity: {
    taxRate: number;
    wageBase: number;
  };
  medicare: {
    taxRate: number;
    additionalTaxRate: number;
    additionalTaxThreshold: Record<FilingStatus, number>;
  };
  estimatedTaxSafeHarborPercent: number;
  childTaxCredit: {
    amount: number;
    phaseoutStart: Record<FilingStatus, number>;
    phaseoutRate: number; // reduction per $1000 over threshold
  };
}

export const TAX_DATA: Record<number, TaxYearData> = {
  2024: {
    year: 2024,
    brackets: {
      single: [
        { min: 0, max: 11600, rate: 0.10 },
        { min: 11600, max: 47150, rate: 0.12 },
        { min: 47150, max: 100525, rate: 0.22 },
        { min: 100525, max: 191950, rate: 0.24 },
        { min: 191950, max: 243725, rate: 0.32 },
        { min: 243725, max: 609350, rate: 0.35 },
        { min: 609350, max: null, rate: 0.37 },
      ],
      married_filing_jointly: [
        { min: 0, max: 23200, rate: 0.10 },
        { min: 23200, max: 94300, rate: 0.12 },
        { min: 94300, max: 201050, rate: 0.22 },
        { min: 201050, max: 383900, rate: 0.24 },
        { min: 383900, max: 487450, rate: 0.32 },
        { min: 487450, max: 731200, rate: 0.35 },
        { min: 731200, max: null, rate: 0.37 },
      ],
      married_filing_separately: [
        { min: 0, max: 11600, rate: 0.10 },
        { min: 11600, max: 47150, rate: 0.12 },
        { min: 47150, max: 100525, rate: 0.22 },
        { min: 100525, max: 191950, rate: 0.24 },
        { min: 191950, max: 243725, rate: 0.32 },
        { min: 243725, max: 365600, rate: 0.35 },
        { min: 365600, max: null, rate: 0.37 },
      ],
      head_of_household: [
        { min: 0, max: 16550, rate: 0.10 },
        { min: 16550, max: 63100, rate: 0.12 },
        { min: 63100, max: 100500, rate: 0.22 },
        { min: 100500, max: 191950, rate: 0.24 },
        { min: 191950, max: 243700, rate: 0.32 },
        { min: 243700, max: 609350, rate: 0.35 },
        { min: 609350, max: null, rate: 0.37 },
      ],
    },
    standardDeduction: {
      single: 14600,
      married_filing_jointly: 29200,
      married_filing_separately: 14600,
      head_of_household: 21900,
    },
    additionalDeduction: {
      age65OrBlind: {
        single: 1950,
        married_filing_jointly: 1550,
        married_filing_separately: 1550,
        head_of_household: 1950,
      },
    },
    qualifiedBusinessIncomeDeductionRate: 0.20,
    capitalGainsBrackets: {
      single: [
        { rate: 0, threshold: 47025 },
        { rate: 0.15, threshold: 518900 },
        { rate: 0.20, threshold: Infinity },
      ],
      married_filing_jointly: [
        { rate: 0, threshold: 94050 },
        { rate: 0.15, threshold: 583750 },
        { rate: 0.20, threshold: Infinity },
      ],
      married_filing_separately: [
        { rate: 0, threshold: 47025 },
        { rate: 0.15, threshold: 291850 },
        { rate: 0.20, threshold: Infinity },
      ],
      head_of_household: [
        { rate: 0, threshold: 63000 },
        { rate: 0.15, threshold: 551350 },
        { rate: 0.20, threshold: Infinity },
      ],
    },
    socialSecurity: {
      taxRate: 0.062,
      wageBase: 168600,
    },
    medicare: {
      taxRate: 0.0145,
      additionalTaxRate: 0.009,
      additionalTaxThreshold: {
        single: 200000,
        married_filing_jointly: 250000,
        married_filing_separately: 125000,
        head_of_household: 200000,
      },
    },
    estimatedTaxSafeHarborPercent: 90,
    childTaxCredit: {
      amount: 2000,
      phaseoutStart: {
        single: 200000,
        married_filing_jointly: 400000,
        married_filing_separately: 200000,
        head_of_household: 200000,
      },
      phaseoutRate: 50,
    },
  },
  2025: {
    year: 2025,
    brackets: {
      single: [
        { min: 0, max: 11925, rate: 0.10 },
        { min: 11925, max: 48475, rate: 0.12 },
        { min: 48475, max: 103350, rate: 0.22 },
        { min: 103350, max: 197300, rate: 0.24 },
        { min: 197300, max: 250525, rate: 0.32 },
        { min: 250525, max: 626350, rate: 0.35 },
        { min: 626350, max: null, rate: 0.37 },
      ],
      married_filing_jointly: [
        { min: 0, max: 23850, rate: 0.10 },
        { min: 23850, max: 96950, rate: 0.12 },
        { min: 96950, max: 206700, rate: 0.22 },
        { min: 206700, max: 394600, rate: 0.24 },
        { min: 394600, max: 501050, rate: 0.32 },
        { min: 501050, max: 751600, rate: 0.35 },
        { min: 751600, max: null, rate: 0.37 },
      ],
      married_filing_separately: [
        { min: 0, max: 11925, rate: 0.10 },
        { min: 11925, max: 48475, rate: 0.12 },
        { min: 48475, max: 103350, rate: 0.22 },
        { min: 103350, max: 197300, rate: 0.24 },
        { min: 197300, max: 250525, rate: 0.32 },
        { min: 250525, max: 375800, rate: 0.35 },
        { min: 375800, max: null, rate: 0.37 },
      ],
      head_of_household: [
        { min: 0, max: 17000, rate: 0.10 },
        { min: 17000, max: 64850, rate: 0.12 },
        { min: 64850, max: 103350, rate: 0.22 },
        { min: 103350, max: 197300, rate: 0.24 },
        { min: 197300, max: 250500, rate: 0.32 },
        { min: 250500, max: 626350, rate: 0.35 },
        { min: 626350, max: null, rate: 0.37 },
      ],
    },
    standardDeduction: {
      single: 15000,
      married_filing_jointly: 30000,
      married_filing_separately: 15000,
      head_of_household: 22500,
    },
    additionalDeduction: {
      age65OrBlind: {
        single: 2000,
        married_filing_jointly: 1600,
        married_filing_separately: 1600,
        head_of_household: 2000,
      },
    },
    qualifiedBusinessIncomeDeductionRate: 0.20,
    capitalGainsBrackets: {
      single: [
        { rate: 0, threshold: 48350 },
        { rate: 0.15, threshold: 533400 },
        { rate: 0.20, threshold: Infinity },
      ],
      married_filing_jointly: [
        { rate: 0, threshold: 96700 },
        { rate: 0.15, threshold: 600050 },
        { rate: 0.20, threshold: Infinity },
      ],
      married_filing_separately: [
        { rate: 0, threshold: 48350 },
        { rate: 0.15, threshold: 300000 },
        { rate: 0.20, threshold: Infinity },
      ],
      head_of_household: [
        { rate: 0, threshold: 64750 },
        { rate: 0.15, threshold: 566700 },
        { rate: 0.20, threshold: Infinity },
      ],
    },
    socialSecurity: {
      taxRate: 0.062,
      wageBase: 176100,
    },
    medicare: {
      taxRate: 0.0145,
      additionalTaxRate: 0.009,
      additionalTaxThreshold: {
        single: 200000,
        married_filing_jointly: 250000,
        married_filing_separately: 125000,
        head_of_household: 200000,
      },
    },
    estimatedTaxSafeHarborPercent: 90,
    childTaxCredit: {
      amount: 2000,
      phaseoutStart: {
        single: 200000,
        married_filing_jointly: 400000,
        married_filing_separately: 200000,
        head_of_household: 200000,
      },
      phaseoutRate: 50,
    },
  },
};

export const SUPPORTED_TAX_YEARS = Object.keys(TAX_DATA).map(Number);
export const LATEST_TAX_YEAR = Math.max(...SUPPORTED_TAX_YEARS);

export function getTaxYearData(year: number): TaxYearData | undefined {
  return TAX_DATA[year];
}
