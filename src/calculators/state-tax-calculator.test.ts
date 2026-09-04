import { describe, expect, it } from "vitest";
import { calculateStateTax } from "./state-tax-calculator.js";

describe("calculateStateTax accuracy safeguards", () => {
  it("fails closed when a graduated state has no brackets", () => {
    expect(() =>
      calculateStateTax({
        stateCode: "AR",
        taxableIncome: 100000,
        filingStatus: "single",
      }),
    ).toThrow("Arkansas graduated tax brackets are not available");
  });

  it("uses explicit California married brackets", () => {
    const single = calculateStateTax({
      stateCode: "CA",
      taxableIncome: 100000,
      filingStatus: "single",
    });
    const married = calculateStateTax({
      stateCode: "CA",
      incomeBeforeDeductions: 100000,
      filingStatus: "married",
    });

    expect(single?.tax).toBe(5438);
    expect(married?.tax).toBe(2581);
  });

  it("keeps the legacy taxableIncome alias equivalent", () => {
    const explicit = calculateStateTax({
      stateCode: "CA",
      incomeBeforeDeductions: 100000,
      filingStatus: "single",
    });
    const legacy = calculateStateTax({
      stateCode: "CA",
      taxableIncome: 100000,
      filingStatus: "single",
    });

    expect(legacy).toEqual(explicit);
  });

  it("applies California mental-health surcharge above $1M for married filers", () => {
    const result = calculateStateTax({
      stateCode: "CA",
      taxableIncome: 1200000,
      filingStatus: "married",
    });

    expect(result?.adjustedIncome).toBe(1188920);
    expect(result?.tax).toBe(114181);
  });

  it("fails closed for married filers when only single brackets are available", () => {
    expect(() =>
      calculateStateTax({
        stateCode: "NY",
        taxableIncome: 100000,
        filingStatus: "married",
      }),
    ).toThrow("New York married filing-status brackets are not available");
  });
});
