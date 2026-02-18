/**
 * W-4 withholding calculator.
 * Helps estimate per-paycheck federal tax withholding and W-4 adjustments.
 */

import { calculateTax, type TaxInput } from "./tax-calculator.js";
import type { FilingStatus } from "../data/tax-brackets.js";

export interface W4Input {
  taxYear: number;
  filingStatus: FilingStatus;
  annualSalary: number;
  payFrequency: "weekly" | "biweekly" | "semimonthly" | "monthly";
  otherIncome?: number;
  deductions?: number;
  dependents?: number;
  extraWithholding?: number;
  spouseWorks?: boolean;
  multipleJobs?: boolean;
}

export interface W4Result {
  taxYear: number;
  filingStatus: FilingStatus;
  annualSalary: number;
  payFrequency: string;
  periodsPerYear: number;
  estimatedAnnualTax: number;
  perPaycheckWithholding: number;
  currentAnnualWithholding: number;
  difference: number;
  w4Recommendations: W4Recommendation[];
}

export interface W4Recommendation {
  field: string;
  value: string;
  explanation: string;
}

const PAY_PERIODS: Record<string, number> = {
  weekly: 52,
  biweekly: 26,
  semimonthly: 24,
  monthly: 12,
};

export function calculateW4(input: W4Input): W4Result {
  const periodsPerYear = PAY_PERIODS[input.payFrequency];
  const totalIncome = input.annualSalary + (input.otherIncome ?? 0);

  const taxInput: TaxInput = {
    taxYear: input.taxYear,
    filingStatus: input.filingStatus,
    grossIncome: totalIncome,
    w2Income: input.annualSalary,
    itemizedDeductions: input.deductions,
    dependents: input.dependents,
  };

  const taxResult = calculateTax(taxInput);
  const estimatedTax = taxResult.totalFederalTax;
  const perPaycheck = Math.round(estimatedTax / periodsPerYear);

  const currentWithholding = (perPaycheck + (input.extraWithholding ?? 0)) * periodsPerYear;
  const difference = estimatedTax - currentWithholding;

  const recommendations: W4Recommendation[] = [];

  // Step 1: Filing status
  recommendations.push({
    field: "Step 1(c): Filing Status",
    value: formatFilingStatus(input.filingStatus),
    explanation: `Check "${formatFilingStatus(input.filingStatus)}" on your W-4`,
  });

  // Step 2: Multiple jobs / spouse works
  if (input.multipleJobs || input.spouseWorks) {
    recommendations.push({
      field: "Step 2: Multiple Jobs",
      value: "Check the box",
      explanation: "Check the box if you have multiple jobs or your spouse also works. This adjusts withholding to avoid underpayment.",
    });
  }

  // Step 3: Dependents
  const dependentCount = input.dependents ?? 0;
  if (dependentCount > 0) {
    const creditAmount = dependentCount * 2000;
    recommendations.push({
      field: "Step 3: Claim Dependents",
      value: `$${creditAmount.toLocaleString()}`,
      explanation: `${dependentCount} qualifying child(ren) × $2,000 = $${creditAmount.toLocaleString()}. Enter this amount.`,
    });
  }

  // Step 4(a): Other income
  const otherIncome = input.otherIncome ?? 0;
  if (otherIncome > 0) {
    recommendations.push({
      field: "Step 4(a): Other Income",
      value: `$${otherIncome.toLocaleString()}`,
      explanation: "Enter income not from jobs (interest, dividends, retirement). This increases withholding.",
    });
  }

  // Step 4(b): Deductions
  const stdDeduction = taxResult.deductionAmount;
  const itemized = input.deductions ?? 0;
  if (itemized > stdDeduction) {
    const excess = itemized - stdDeduction;
    recommendations.push({
      field: "Step 4(b): Deductions",
      value: `$${excess.toLocaleString()}`,
      explanation: `Your itemized deductions ($${itemized.toLocaleString()}) exceed the standard deduction ($${stdDeduction.toLocaleString()}) by $${excess.toLocaleString()}. Enter the excess to reduce withholding.`,
    });
  }

  // Step 4(c): Extra withholding
  if (difference > 0) {
    const extraPerPaycheck = Math.ceil(difference / periodsPerYear);
    recommendations.push({
      field: "Step 4(c): Extra Withholding",
      value: `$${extraPerPaycheck}`,
      explanation: `To avoid owing at tax time, withhold an extra $${extraPerPaycheck} per paycheck.`,
    });
  }

  return {
    taxYear: input.taxYear,
    filingStatus: input.filingStatus,
    annualSalary: input.annualSalary,
    payFrequency: input.payFrequency,
    periodsPerYear,
    estimatedAnnualTax: estimatedTax,
    perPaycheckWithholding: perPaycheck,
    currentAnnualWithholding: currentWithholding,
    difference,
    w4Recommendations: recommendations,
  };
}

function formatFilingStatus(status: FilingStatus): string {
  switch (status) {
    case "single": return "Single or Married filing separately";
    case "married_filing_jointly": return "Married filing jointly";
    case "married_filing_separately": return "Single or Married filing separately";
    case "head_of_household": return "Head of household";
  }
}
