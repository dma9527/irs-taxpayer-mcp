/**
 * State tax calculation engine.
 * Extracted for reuse across tools (estimate_state_tax, calculate_total_tax).
 */

import { getStateInfo, type StateBracket } from "../data/state-taxes.js";

export interface StateTaxInput {
  stateCode: string;
  taxableIncome: number;
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
  const state = getStateInfo(input.stateCode);
  if (!state) return null;

  if (state.taxType === "none") {
    return {
      stateCode: state.code,
      stateName: state.name,
      taxType: "none",
      grossIncome: input.taxableIncome,
      deduction: 0,
      adjustedIncome: input.taxableIncome,
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

  const adjustedIncome = Math.max(0, input.taxableIncome - deduction);
  let tax = 0;

  if (state.taxType === "flat") {
    tax = adjustedIncome * state.topRate;
  } else if (state.brackets && state.brackets.length > 0) {
    tax = calculateGraduatedTax(adjustedIncome, state.brackets);
  } else {
    tax = adjustedIncome * state.topRate;
  }

  return {
    stateCode: state.code,
    stateName: state.name,
    taxType: state.taxType,
    grossIncome: input.taxableIncome,
    deduction,
    adjustedIncome,
    tax: Math.round(tax),
    effectiveRate: input.taxableIncome > 0 ? tax / input.taxableIncome : 0,
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
