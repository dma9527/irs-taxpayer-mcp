/**
 * Federal income tax brackets and standard deductions for TY2024 and TY2025.
 *
 * IRS Sources:
 *   TY2024: Revenue Procedure 2023-34 (https://www.irs.gov/irb/2023-44_IRB#REV-PROC-2023-34)
 *   TY2025: Revenue Procedure 2024-40 (https://www.irs.gov/irb/2024-44_IRB#REV-PROC-2024-40)
 *
 * Data points verified:
 *   - Tax brackets: Rev. Proc. §3.01 (Table 1-4)
 *   - Standard deduction: Rev. Proc. §3.02
 *   - Capital gains brackets: Rev. Proc. §3.03
 *   - Social Security wage base: SSA announcement
 *   - AMT exemption: Rev. Proc. §3.04
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
  amt: {
    exemption: Record<FilingStatus, number>;
    phaseoutStart: Record<FilingStatus, number>;
    rate28Threshold: number;
  };
  saltCap: {
    base: number;
    mfs: number;
    enhancedCap?: number;
    enhancedAgiThreshold?: number;
  };
  /** OBBB new deductions (TY2025+) */
  obbbDeductions?: {
    seniorBonus: { amount: number; phaseoutSingle: number; phaseoutMFJ: number };
    tipsDeduction: { max: number; agiLimitSingle: number; agiLimitMFJ: number };
    overtimeDeduction: { maxSingle: number; maxMFJ: number; agiLimitSingle: number; agiLimitMFJ: number };
    autoLoanInterest: { max: number; agiLimitSingle: number; agiLimitMFJ: number };
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
    amt: {
      exemption: {
        single: 85700,
        married_filing_jointly: 133300,
        married_filing_separately: 66650,
        head_of_household: 85700,
      },
      phaseoutStart: {
        single: 609350,
        married_filing_jointly: 1218700,
        married_filing_separately: 609350,
        head_of_household: 609350,
      },
      rate28Threshold: 232600,
    },
    saltCap: {
      base: 10000,
      mfs: 5000,
    },
  },
  // Source: IRS Revenue Procedure 2024-40, One Big Beautiful Bill Act (2025)
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
      single: 15750,
      married_filing_jointly: 31500,
      married_filing_separately: 15750,
      head_of_household: 23625,
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
      amount: 2200, // OBBB: increased from $2,000 to $2,200 for TY2025+
      phaseoutStart: {
        single: 200000,
        married_filing_jointly: 400000,
        married_filing_separately: 200000,
        head_of_household: 200000,
      },
      phaseoutRate: 50,
    },
    amt: {
      exemption: {
        single: 88100,
        married_filing_jointly: 137000,
        married_filing_separately: 68500,
        head_of_household: 88100,
      },
      phaseoutStart: {
        single: 626350,
        married_filing_jointly: 1252700,
        married_filing_separately: 626350,
        head_of_household: 626350,
      },
      rate28Threshold: 239100,
    },
    saltCap: {
      base: 10000,
      mfs: 20000, // OBBB: MFS cap raised to $20K (was $5K)
      enhancedCap: 40000,
      enhancedAgiThreshold: 500000, // phases down above $500K MFJ / $250K MFS
    },
    obbbDeductions: {
      seniorBonus: { amount: 6000, phaseoutSingle: 75000, phaseoutMFJ: 150000 },
      tipsDeduction: { max: 25000, agiLimitSingle: 150000, agiLimitMFJ: 300000 },
      overtimeDeduction: { maxSingle: 12500, maxMFJ: 25000, agiLimitSingle: 150000, agiLimitMFJ: 300000 },
      autoLoanInterest: { max: 10000, agiLimitSingle: 100000, agiLimitMFJ: 200000 },
    },
  },
};

export const SUPPORTED_TAX_YEARS = Object.keys(TAX_DATA).map(Number);
export const LATEST_TAX_YEAR = Math.max(...SUPPORTED_TAX_YEARS);

export function getTaxYearData(year: number): TaxYearData | undefined {
  return TAX_DATA[year];
}

/**
 * Get the effective SALT deduction cap for a given tax year, filing status, and AGI.
 * TY2024: $10K ($5K MFS)
 * TY2025+: $40K for AGI ≤ $500K (MFJ), phases down to $10K for higher AGI
 */
export function getSaltCap(
  taxYear: number,
  filingStatus: FilingStatus,
  agi: number
): number {
  const data = TAX_DATA[taxYear];
  if (!data) return 10000;

  const cap = data.saltCap;
  if (filingStatus === "married_filing_separately") return cap.mfs;

  if (cap.enhancedCap && cap.enhancedAgiThreshold) {
    if (agi <= cap.enhancedAgiThreshold) return cap.enhancedCap;
    // Phase down: for every $1K over threshold, reduce by $1K (simplified)
    const excess = agi - cap.enhancedAgiThreshold;
    const reduction = Math.min(excess, cap.enhancedCap - cap.base);
    return Math.max(cap.base, cap.enhancedCap - reduction);
  }

  return cap.base;
}
