import { describe, expect, it } from "vitest";
import { calculateStateTax } from "./state-tax-calculator.js";

describe("calculateStateTax accuracy safeguards", () => {
  it("fails closed when a graduated state has no brackets", () => {
    expect(() =>
      calculateStateTax({
        stateCode: "AR",
        taxYear: 2024,
        taxableIncome: 100000,
        filingStatus: "single",
      }),
    ).toThrow("Arkansas TY2024 calculation data are not available");
  });

  it("uses explicit California married brackets", () => {
    const single = calculateStateTax({
      stateCode: "CA",
      taxYear: 2024,
      taxableIncome: 100000,
      filingStatus: "single",
    });
    const married = calculateStateTax({
      stateCode: "CA",
      taxYear: 2024,
      incomeBeforeDeductions: 100000,
      filingStatus: "married",
    });

    expect(single?.tax).toBe(5327);
    expect(married?.tax).toBe(2490);
  });

  it("keeps the legacy taxableIncome alias equivalent", () => {
    const explicit = calculateStateTax({
      stateCode: "CA",
      taxYear: 2024,
      incomeBeforeDeductions: 100000,
      filingStatus: "single",
    });
    const legacy = calculateStateTax({
      stateCode: "CA",
      taxYear: 2024,
      taxableIncome: 100000,
      filingStatus: "single",
    });

    expect(legacy).toEqual(explicit);
  });

  it("applies California mental-health surcharge above $1M for married filers", () => {
    const result = calculateStateTax({
      stateCode: "CA",
      taxYear: 2024,
      taxableIncome: 1200000,
      filingStatus: "married",
    });

    expect(result?.adjustedIncome).toBe(1188920);
    expect(result?.tax).toBe(113453);
  });

  it("fails closed when the state has no profile for the requested year", () => {
    expect(() =>
      calculateStateTax({
        stateCode: "CA",
        taxYear: 2025,
        incomeBeforeDeductions: 100000,
        filingStatus: "single",
      }),
    ).toThrow("California TY2025 calculation data are not available");
  });

  it("fails closed when an unverified state profile is unavailable", () => {
    expect(() =>
      calculateStateTax({
        stateCode: "NY",
        taxYear: 2024,
        taxableIncome: 100000,
        filingStatus: "married",
      }),
    ).toThrow("New York TY2024 calculation data are not available");
  });
});
