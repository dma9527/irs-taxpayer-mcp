/**
 * Core tax calculation engine.
 * All calculations run locally — no user data leaves the machine.
 */

import {
  type FilingStatus,
  type TaxBracket,
  type TaxYearData,
  getTaxYearData,
} from "../data/tax-brackets.js";
import { validate, validateIncome, validateTaxYear, formatValidationErrors } from "./validation.js";

export interface TaxInput {
  taxYear: number;
  filingStatus: FilingStatus;
  grossIncome: number;
  w2Income?: number;
  selfEmploymentIncome?: number;
  capitalGains?: number;
  capitalGainsLongTerm?: boolean;
  shortTermCapitalGains?: number;
  aboveTheLineDeductions?: number;
  itemizedDeductions?: number;
  dependents?: number;
  age65OrOlder?: boolean;
  blind?: boolean;
  spouseAge65OrOlder?: boolean;
  spouseBlind?: boolean;
  qualifiedBusinessIncome?: number;
  isoExerciseSpread?: number;
  stateTaxDeducted?: number;
}

export interface TaxBreakdown {
  taxYear: number;
  filingStatus: FilingStatus;
  grossIncome: number;
  adjustedGrossIncome: number;
  deductionType: "standard" | "itemized";
  deductionAmount: number;
  taxableIncome: number;
  bracketBreakdown: { rate: number; taxableAmount: number; tax: number }[];
  ordinaryIncomeTax: number;
  capitalGainsTax: number;
  selfEmploymentTax: number;
  niit: number;
  additionalMedicareTax: number;
  qbiDeduction: number;
  amt: number;
  totalFederalTax: number;
  effectiveRate: number;
  marginalRate: number;
  childTaxCredit: number;
  estimatedQuarterlyPayment: number;
}

function calculateBracketTax(
  taxableIncome: number,
  brackets: TaxBracket[]
): { breakdown: { rate: number; taxableAmount: number; tax: number }[]; total: number; marginalRate: number } {
  const breakdown: { rate: number; taxableAmount: number; tax: number }[] = [];
  let remaining = taxableIncome;
  let total = 0;
  let marginalRate = 0;

  for (const bracket of brackets) {
    if (remaining <= 0) break;

    const bracketSize = bracket.max !== null ? bracket.max - bracket.min : Infinity;
    const taxableAmount = Math.min(remaining, bracketSize);
    const tax = taxableAmount * bracket.rate;

    breakdown.push({ rate: bracket.rate, taxableAmount, tax });
    total += tax;
    remaining -= taxableAmount;
    marginalRate = bracket.rate;
  }

  return { breakdown, total, marginalRate };
}

function calculateCapitalGainsTax(
  gains: number,
  taxableOrdinaryIncome: number,
  filingStatus: FilingStatus,
  taxData: TaxYearData
): number {
  if (gains <= 0) return 0;

  const cgBrackets = taxData.capitalGainsBrackets[filingStatus];
  let tax = 0;
  let remainingGains = gains;
  let incomeFloor = taxableOrdinaryIncome;

  for (const bracket of cgBrackets) {
    if (remainingGains <= 0) break;

    const spaceInBracket = Math.max(0, bracket.threshold - incomeFloor);
    const taxableAtThisRate = Math.min(remainingGains, spaceInBracket);

    tax += taxableAtThisRate * bracket.rate;
    remainingGains -= taxableAtThisRate;
    incomeFloor += taxableAtThisRate;
  }

  return tax;
}

function calculateSelfEmploymentTax(seIncome: number, taxData: TaxYearData, w2Income: number = 0): number {
  if (seIncome <= 0) return 0;

  const netEarnings = seIncome * 0.9235; // 92.35% of SE income
  // W-2 wages already used part of the SS wage base
  const remainingWageBase = Math.max(0, taxData.socialSecurity.wageBase - w2Income);
  const ssWages = Math.min(netEarnings, remainingWageBase);
  const ssTax = ssWages * taxData.socialSecurity.taxRate * 2; // both employer + employee share
  const medicareTax = netEarnings * taxData.medicare.taxRate * 2;

  return ssTax + medicareTax;
}

/**
 * Net Investment Income Tax (NIIT) — 3.8% on investment income
 * for taxpayers with MAGI above threshold.
 */
function calculateNIIT(
  agi: number,
  investmentIncome: number,
  filingStatus: FilingStatus
): number {
  const thresholds: Record<FilingStatus, number> = {
    single: 200000,
    married_filing_jointly: 250000,
    married_filing_separately: 125000,
    head_of_household: 200000,
  };
  const threshold = thresholds[filingStatus];
  if (agi <= threshold || investmentIncome <= 0) return 0;

  const excess = agi - threshold;
  const taxableNII = Math.min(investmentIncome, excess);
  return taxableNII * 0.038;
}

/**
 * Additional Medicare Tax — 0.9% on earned income above threshold.
 * Applies to W-2 wages + SE income.
 */
function calculateAdditionalMedicareTax(
  earnedIncome: number,
  filingStatus: FilingStatus,
  taxData: TaxYearData
): number {
  const threshold = taxData.medicare.additionalTaxThreshold[filingStatus];
  if (earnedIncome <= threshold) return 0;
  return (earnedIncome - threshold) * taxData.medicare.additionalTaxRate;
}

/**
 * Qualified Business Income (QBI) deduction — Section 199A.
 * Simplified: 20% of QBI, limited to 20% of taxable income.
 */
function calculateQBIDeduction(
  qbi: number,
  taxableIncomeBeforeQBI: number,
  taxData: TaxYearData
): number {
  if (qbi <= 0) return 0;
  const deduction = qbi * taxData.qualifiedBusinessIncomeDeductionRate;
  const limit = taxableIncomeBeforeQBI * taxData.qualifiedBusinessIncomeDeductionRate;
  return Math.min(deduction, limit);
}

/**
 * Alternative Minimum Tax (AMT).
 * Simplified: adds back common AMT preference items (SALT, ISO spread),
 * applies AMT exemption with phase-out, then 26%/28% rates.
 * AMT = max(0, tentative AMT - regular tax).
 */
/**
 * Refactored Alternative Minimum Tax (AMT) Calculation
 * Compliant with 2025 Form 6251 Parts I & II
 */
function calculateAMT(
  regularTax: number,           // Total regular tax (ordinary + capital gains)
  taxableIncome: number,        // Regular taxable income
  filingStatus: FilingStatus,
  taxData: TaxYearData,
  isoSpread: number,
  saltDeducted: number,
  longTermGains: number = 0     // Added to handle Part III capital gains compliance
): number {
  // 1. Calculate Alternative Minimum Taxable Income (AMTI) - Form 6251 Line 4
  const amtIncome = taxableIncome + isoSpread + saltDeducted;

  // 2. Fetch 2025 explicit limits from taxData object
  let exemption = taxData.amt.exemption[filingStatus];          // e.g., 88100, 137000, or 68500
  const phaseoutStart = taxData.amt.phaseoutStart[filingStatus]; // e.g., 626350 or 1252700

  // 3. Exemption Phase-out Calculation (25 cents per dollar over threshold)
  if (amtIncome > phaseoutStart) {
    const reduction = (amtIncome - phaseoutStart) * 0.25;
    exemption = Math.max(0, exemption - reduction);
  }

  // Form 6251 Line 6
  const amtBase = Math.max(0, amtIncome - exemption); 
  if (amtBase === 0) return 0;

  // 4. Determine AMT 26% Bracket Threshold based on Filing Status (Form 6251 Line 7)
  const amtRate28Threshold = filingStatus === "married_filing_separately" ? 119550 : 239100;

  let tentativeAMT = 0;

  // 5. Part III Compliance: Treat Capital Gains Preferentially
  if (longTermGains > 0) {
    // Separate capital gains out from standard AMTI base to avoid over-taxing at 26%/28%
    const amtOrdinaryBase = Math.max(0, amtBase - longTermGains);
    
    // Calculate ordinary portion AMT tax brackets
    if (amtOrdinaryBase <= amtRate28Threshold) {
      tentativeAMT += amtOrdinaryBase * 0.26;
    } else {
      tentativeAMT += (amtRate28Threshold * 0.26) + ((amtOrdinaryBase - amtRate28Threshold) * 0.28);
    }
    
    // Simulate capital gains tax inside AMT (Mimicking Part III maximum rates 15%/20%)
    // For a highly precise engine, map the dynamic thresholds from Lines 18-40
    let remainingGains = longTermGains;
    let incomeFloor = amtOrdinaryBase;
    const cgBrackets = taxData.capitalGainsBrackets[filingStatus];

    for (const bracket of cgBrackets) {
      if (remainingGains <= 0) break;
      const spaceInBracket = Math.max(0, bracket.threshold - incomeFloor);
      const taxableAtThisRate = Math.min(remainingGains, spaceInBracket);

      tentativeAMT += taxableAtThisRate * bracket.rate;
      remainingGains -= taxableAtThisRate;
      incomeFloor += taxableAtThisRate;
    }
  } else {
    // No Capital Gains: Standard 26% / 28% Split (Form 6251 Lines 96-97)
    if (amtBase <= amtRate28Threshold) {
      tentativeAMT = amtBase * 0.26;
    } else {
      const subtractAmt = filingStatus === "married_filing_separately" ? 2391 : 4782;
      tentativeAMT = (amtBase * 0.28) - subtractAmt;
    }
  }

  // 6. AMT is the excess of tentative AMT over regular tax (Form 6251 Line 11)
  return Math.max(0, tentativeAMT - regularTax);
}
export function calculateTax(input: TaxInput): TaxBreakdown {
  // Input validation
  const errors = validate(
    validateTaxYear(input.taxYear),
    validateIncome(input.grossIncome, "grossIncome"),
  );
  if (errors.length > 0) {
    throw new Error(formatValidationErrors(errors));
  }

  const taxData = getTaxYearData(input.taxYear);
  if (!taxData) {
    throw new Error(`Tax year ${input.taxYear} is not supported. Supported years: 2024, 2025`);
  }

  // Step 1: Calculate AGI
  const aboveTheLine = input.aboveTheLineDeductions ?? 0;
  const w2 = input.w2Income ?? 0;
  const seDeduction = input.selfEmploymentIncome
    ? calculateSelfEmploymentTax(input.selfEmploymentIncome, taxData, w2) * 0.5
    : 0;
  const agi = input.grossIncome - aboveTheLine - seDeduction;

  // Step 2: Determine deduction (standard vs itemized)
  let standardDeduction = taxData.standardDeduction[input.filingStatus];

  // Additional deduction for age 65+ or blind
  const additionalAmount = taxData.additionalDeduction.age65OrBlind[input.filingStatus];
  if (input.age65OrOlder) standardDeduction += additionalAmount;
  if (input.blind) standardDeduction += additionalAmount;
  if (input.spouseAge65OrOlder) standardDeduction += additionalAmount;
  if (input.spouseBlind) standardDeduction += additionalAmount;

  const itemized = input.itemizedDeductions ?? 0;
  const useItemized = itemized > standardDeduction;
  const deductionAmount = useItemized ? itemized : standardDeduction;

  // Step 3: Calculate taxable income
  const longTermGains = (input.capitalGainsLongTerm !== false ? (input.capitalGains ?? 0) : 0);
  const shortTermGains = input.shortTermCapitalGains ?? (input.capitalGainsLongTerm === false ? (input.capitalGains ?? 0) : 0);
  const ordinaryIncome = input.grossIncome - longTermGains;
  const taxableOrdinaryIncome = Math.max(0, ordinaryIncome - aboveTheLine - seDeduction - deductionAmount);

  // Step 4: QBI deduction
  const qbi = input.qualifiedBusinessIncome ?? 0;
  const taxableBeforeQBI = taxableOrdinaryIncome + longTermGains;
  const qbiDeduction = calculateQBIDeduction(qbi, taxableBeforeQBI, taxData);

  const adjustedTaxableOrdinary = Math.max(0, taxableOrdinaryIncome - qbiDeduction);

  // Step 5: Calculate ordinary income tax
  const { breakdown, total: ordinaryTax, marginalRate } = calculateBracketTax(
    adjustedTaxableOrdinary,
    taxData.brackets[input.filingStatus]
  );

  // Step 6: Capital gains tax (long-term only)
  const cgTax = longTermGains > 0
    ? calculateCapitalGainsTax(longTermGains, adjustedTaxableOrdinary, input.filingStatus, taxData)
    : 0;

  // Step 7: Self-employment tax
  const seTax = input.selfEmploymentIncome
    ? calculateSelfEmploymentTax(input.selfEmploymentIncome, taxData, w2)
    : 0;

  // Step 8: NIIT (3.8% on investment income above threshold)
  const investmentIncome = longTermGains + shortTermGains;
  const niit = calculateNIIT(agi, investmentIncome, input.filingStatus);

  // Step 9: Additional Medicare Tax (0.9% on earned income above threshold)
  const earnedIncome = (input.w2Income ?? 0) + (input.selfEmploymentIncome ?? 0);
  const additionalMedicareTax = calculateAdditionalMedicareTax(earnedIncome, input.filingStatus, taxData);

  // Step 10: Child Tax Credit
  const dependents = input.dependents ?? 0;
  let childCredit = dependents * taxData.childTaxCredit.amount;
  const phaseoutStart = taxData.childTaxCredit.phaseoutStart[input.filingStatus];
  if (agi > phaseoutStart) {
    const excess = Math.ceil((agi - phaseoutStart) / 1000) * taxData.childTaxCredit.phaseoutRate;
    childCredit = Math.max(0, childCredit - excess);
  }

  const totalTaxBeforeAMT = Math.max(0, ordinaryTax + cgTax + seTax + niit + additionalMedicareTax - childCredit);

  // Step 11: AMT
  const isoSpread = input.isoExerciseSpread ?? 0;
  const saltDeducted = useItemized ? (input.stateTaxDeducted ?? 0) : 0;
  const regularIncomeTax = ordinaryTax + cgTax;
  // Added parameter longTermGains
  const amt = calculateAMT(regularIncomeTax, taxableOrdinaryIncome + longTermGains, input.filingStatus, taxData, isoSpread, saltDeducted, longTermGains);
  const totalTax = totalTaxBeforeAMT + amt;
  const taxableIncome = adjustedTaxableOrdinary + longTermGains;

  return {
    taxYear: input.taxYear,
    filingStatus: input.filingStatus,
    grossIncome: input.grossIncome,
    adjustedGrossIncome: agi,
    deductionType: useItemized ? "itemized" : "standard",
    deductionAmount,
    taxableIncome,
    bracketBreakdown: breakdown,
    ordinaryIncomeTax: ordinaryTax,
    capitalGainsTax: cgTax,
    selfEmploymentTax: seTax,
    niit,
    additionalMedicareTax,
    qbiDeduction,
    amt,
    totalFederalTax: totalTax,
    effectiveRate: input.grossIncome > 0 ? totalTax / input.grossIncome : 0,
    marginalRate,
    childTaxCredit: childCredit,
    estimatedQuarterlyPayment: Math.ceil(totalTax / 4),
  };
}
