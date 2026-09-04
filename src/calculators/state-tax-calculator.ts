/**
 * State tax calculation engine.
 * Extracted for reuse across tools (estimate_state_tax, calculate_total_tax).
 */

import {
  getStateCalculationInfo,
  getStateInfo,
  type StateBracket,
} from "../data/state-taxes.js";

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
  filingStatus?: "single" | "married";
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

  const status = input.filingStatus ?? "single";
  let deduction = 0;

  if (state.standardDeduction) {
    deduction = status === "married" ? state.standardDeduction.married : state.standardDeduction.single;
  }
  if (state.personalExemption) {
    deduction += status === "married" ? state.personalExemption.married : state.personalExemption.single;
  }

  const adjustedIncome = Math.max(0, incomeBeforeDeductions - deduction);
  let tax = 0;

  if (state.taxType === "flat") {
    tax = adjustedIncome * state.topRate;
  } else {
    if (!state.brackets || state.brackets.length === 0) {
      throw new UnsupportedStateTaxCalculationError(
        `${state.name} graduated tax brackets are not available`,
      );
    }
    const brackets = status === "married" ? state.marriedBrackets : state.brackets;
    if (!brackets || brackets.length === 0) {
      throw new UnsupportedStateTaxCalculationError(
        `${state.name} married filing-status brackets are not available`,
      );
    }
    tax = calculateGraduatedTax(adjustedIncome, brackets);
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
