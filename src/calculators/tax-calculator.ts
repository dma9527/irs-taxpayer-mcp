/**
 * Core tax calculation engine.
 * All calculations run locally — no user data leaves the machine.
 */

import {
  type FilingStatus,
  type TaxBracket,
  type TaxYearData,
  getTaxYearData,
  LATEST_TAX_YEAR,
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

function calculateSelfEmploymentTax(seIncome: number, taxData: TaxYearData): number {
  if (seIncome <= 0) return 0;

  const netEarnings = seIncome * 0.9235; // 92.35% of SE income
  const ssWages = Math.min(netEarnings, taxData.socialSecurity.wageBase);
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
function calculateAMT(
  regularTax: number,
  taxableIncome: number,
  filingStatus: FilingStatus,
  taxData: TaxYearData,
  isoSpread: number,
  saltDeducted: number
): number {
  // AMT income = regular taxable income + preference items
  const amtIncome = taxableIncome + isoSpread + saltDeducted;

  // Exemption with phase-out (25 cents per dollar over threshold)
  let exemption = taxData.amt.exemption[filingStatus];
  const phaseoutStart = taxData.amt.phaseoutStart[filingStatus];
  if (amtIncome > phaseoutStart) {
    const reduction = (amtIncome - phaseoutStart) * 0.25;
    exemption = Math.max(0, exemption - reduction);
  }

  const amtBase = Math.max(0, amtIncome - exemption);

  // 26% on first portion, 28% on remainder
  const threshold = taxData.amt.rate28Threshold;
  let tentativeAMT: number;
  if (amtBase <= threshold) {
    tentativeAMT = amtBase * 0.26;
  } else {
    tentativeAMT = threshold * 0.26 + (amtBase - threshold) * 0.28;
  }

  // AMT is the excess over regular tax
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
  const seDeduction = input.selfEmploymentIncome
    ? calculateSelfEmploymentTax(input.selfEmploymentIncome, taxData) * 0.5
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
    ? calculateSelfEmploymentTax(input.selfEmploymentIncome, taxData)
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
  const amt = calculateAMT(regularIncomeTax, taxableOrdinaryIncome + longTermGains, input.filingStatus, taxData, isoSpread, saltDeducted);

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
