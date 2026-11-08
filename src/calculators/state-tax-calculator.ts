/**
 * State tax calculation engine.
 * Extracted for reuse across tools (estimate_state_tax, calculate_total_tax).
 */

import {
  getStateCalculationInfo,
  getStateInfo,
  type FilingStatusOverride,
  type StateBracket,
} from "../data/state-taxes.js";

export type StateFilingStatus =
  | "single"
  | "married"
  | "married_filing_jointly"
  | "married_filing_separately"
  | "head_of_household";

export class UnsupportedStateTaxCalculationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsupportedStateTaxCalculationError";
  }
}

export interface StateTaxInput {
  stateCode: string;
  taxYear: number;
  incomeBeforeDeductions?: number;
  /** @deprecated Use incomeBeforeDeductions. */
  taxableIncome?: number;
  /** "married" is an alias of married_filing_jointly. */
  filingStatus?: StateFilingStatus;
  /** Federal taxable income (Form 1040 line 15), required by states whose base starts there. */
  federalTaxableIncome?: number;
}

export interface StateTaxResult {
  stateCode: string;
  stateName: string;
  taxType: "none" | "flat" | "graduated";
  grossIncome: number;
  deduction: number;
  adjustedIncome: number;
  tax: number;
  effectiveRate: number;
  hasLocalTaxes: boolean;
  notes?: string;
}

export function calculateStateTax(input: StateTaxInput): StateTaxResult | null {
  const stateReference = getStateInfo(input.stateCode);
  if (!stateReference) return null;

  const state = getStateCalculationInfo(input.stateCode, input.taxYear);
  if (!state) {
    throw new UnsupportedStateTaxCalculationError(
      `${stateReference.name} TY${input.taxYear} calculation data are not available`,
    );
  }

  const hasExplicitIncome = input.incomeBeforeDeductions !== undefined;
  const hasLegacyIncome = input.taxableIncome !== undefined;
  if (hasExplicitIncome === hasLegacyIncome) {
    throw new Error(
      "Provide exactly one of incomeBeforeDeductions or taxableIncome",
    );
  }
  const incomeBeforeDeductions = input.incomeBeforeDeductions ?? input.taxableIncome;
  if (incomeBeforeDeductions === undefined) {
    throw new Error("State income before deductions is required");
  }

  if (state.taxType === "none") {
    return {
      stateCode: state.code,
      stateName: state.name,
      taxType: "none",
      grossIncome: incomeBeforeDeductions,
      deduction: 0,
      adjustedIncome: incomeBeforeDeductions,
      tax: 0,
      effectiveRate: 0,
      hasLocalTaxes: false,
      notes: state.notes,
    };
  }

  const requested = input.filingStatus ?? "single";
  const status: "single" | "married" =
    requested === "married" || requested === "married_filing_jointly" ? "married" : "single";
  let override: FilingStatusOverride | undefined;
  if ((requested === "head_of_household" || requested === "married_filing_separately") && input.taxYear >= 2026) {
    override = state.filingStatusOverrides?.[requested];
    if (!override) {
      throw new UnsupportedStateTaxCalculationError(
        `${state.name} TY${input.taxYear} ${requested.replace(/_/g, " ")} rules are not modeled`,
      );
    }
  }
  if (state.incomeBase === "federal_taxable_income") {
    if (input.federalTaxableIncome === undefined) {
      throw new UnsupportedStateTaxCalculationError(
        `${state.name} TY${input.taxYear} starts from federal taxable income, which was not provided`,
      );
    }
    const brackets = override?.brackets ?? (status === "married" ? state.marriedBrackets : state.brackets);
    if (!brackets || brackets.length === 0) {
      throw new UnsupportedStateTaxCalculationError(`${state.name} brackets are not available`);
    }
    const adjustedIncome = Math.max(0, input.federalTaxableIncome);
    const tax = calculateGraduatedTax(adjustedIncome, brackets);
    return {
      stateCode: state.code,
      stateName: state.name,
      taxType: state.taxType,
      grossIncome: incomeBeforeDeductions,
      deduction: Math.max(0, incomeBeforeDeductions - adjustedIncome),
      adjustedIncome,
      tax: Math.round(tax),
      effectiveRate: incomeBeforeDeductions > 0 ? tax / incomeBeforeDeductions : 0,
      hasLocalTaxes: state.localTaxes ?? false,
      notes: state.notes,
    };
  }
  const pick = (pair: { single: number; married: number } | undefined): number | undefined =>
    pair === undefined ? undefined : (status === "married" ? pair.married : pair.single);
  const maxModeledIncome = override?.maxModeledIncome ?? state.maxModeledIncome;
  if (maxModeledIncome !== undefined && incomeBeforeDeductions > maxModeledIncome) {
    throw new UnsupportedStateTaxCalculationError(
      `${state.name} TY${input.taxYear} income above $${maxModeledIncome.toLocaleString("en-US")} is not modeled`,
    );
  }
  let deduction = override?.standardDeduction ?? pick(state.standardDeduction) ?? 0;
  const exemptionIncomeLimit = override?.exemptionIncomeLimit ?? pick(state.exemptionIncomeLimit) ?? Infinity;
  const personalExemption = override?.personalExemption ?? pick(state.personalExemption);
  if (personalExemption !== undefined && incomeBeforeDeductions <= exemptionIncomeLimit) {
    deduction += personalExemption;
  }
  if (state.personalExemptionTiers) {
    const tier = state.personalExemptionTiers.find(({ maxIncome, inclusive }) =>
      inclusive ? incomeBeforeDeductions <= maxIncome : incomeBeforeDeductions < maxIncome);
    deduction += (tier?.amountPerPerson ?? 0) * (status === "married" ? 2 : 1);
  }

  const adjustedIncome = Math.max(0, incomeBeforeDeductions - deduction);
  let tax = 0;

  if (state.taxType === "flat" && state.thresholdTax) {
    const { threshold, baseTax } = state.thresholdTax;
    tax = adjustedIncome <= threshold ? 0 : baseTax + (adjustedIncome - threshold) * state.topRate;
  } else if (state.taxType === "flat") {
    tax = adjustedIncome * state.topRate;
  } else {
    if (!state.brackets || state.brackets.length === 0) {
      throw new UnsupportedStateTaxCalculationError(
        `${state.name} graduated tax brackets are not available`,
      );
    }
    const brackets = override?.brackets ?? (status === "married" ? state.marriedBrackets : state.brackets);
    if (!brackets || brackets.length === 0) {
      throw new UnsupportedStateTaxCalculationError(
        `${state.name} married filing-status brackets are not available`,
      );
    }
    tax = calculateGraduatedTax(adjustedIncome, brackets);
  }

  const personalCredit = override?.personalCredit ?? pick(state.personalCredit);
  if (personalCredit !== undefined) {
    tax = Math.max(0, tax - personalCredit);
  }

  return {
    stateCode: state.code,
    stateName: state.name,
    taxType: state.taxType,
    grossIncome: incomeBeforeDeductions,
    deduction,
    adjustedIncome,
    tax: Math.round(tax),
    effectiveRate: incomeBeforeDeductions > 0 ? tax / incomeBeforeDeductions : 0,
    hasLocalTaxes: state.localTaxes ?? false,
    notes: state.notes,
  };
}

function calculateGraduatedTax(income: number, brackets: StateBracket[]): number {
  let tax = 0;
  let remaining = income;

  for (const bracket of brackets) {
    if (remaining <= 0) break;
    const bracketSize = bracket.max !== null ? bracket.max - bracket.min : Infinity;
    const taxable = Math.min(remaining, bracketSize);
    tax += taxable * bracket.rate;
    remaining -= taxable;
  }

  return tax;
}
