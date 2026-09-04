import { describe, it, expect } from "vitest";
import {
  STATE_TAX_DATA,
  getStateInfo,
  getStateCalculationInfo,
  getNoIncomeTaxStates,
} from "./state-taxes.js";

describe("state tax data integrity", () => {
  it("has all 50 states + DC", () => {
    expect(Object.keys(STATE_TAX_DATA).length).toBe(51);
  });

  it("has 9 no-income-tax states", () => {
    const noTax = getNoIncomeTaxStates();
    expect(noTax.length).toBe(9);
    const codes = noTax.map((s) => s.code).sort();
    expect(codes).toEqual(["AK", "FL", "NH", "NV", "SD", "TN", "TX", "WA", "WY"]);
  });

  it("all states have required fields", () => {
    for (const [code, state] of Object.entries(STATE_TAX_DATA)) {
      expect(state.code).toBe(code);
      expect(state.name).toBeTruthy();
      expect(["none", "flat", "graduated"]).toContain(state.taxType);
      expect(state.topRate).toBeGreaterThanOrEqual(0);
    }
  });

  it("graduated states with brackets have contiguous ranges", () => {
    for (const state of Object.values(STATE_TAX_DATA)) {
      if (state.brackets && state.brackets.length > 0) {
        expect(state.brackets[0].min).toBe(0);
        for (let i = 1; i < state.brackets.length; i++) {
          expect(state.brackets[i].min).toBe(state.brackets[i - 1].max);
        }
        expect(state.brackets[state.brackets.length - 1].max).toBeNull();
      }
    }
  });

  it("California has highest state rate", () => {
    const ca = getStateInfo("CA");
    expect(ca).toBeDefined();
    expect(ca!.topRate).toBe(0.133);
  });

  it("getStateInfo is case-insensitive", () => {
    expect(getStateInfo("ca")).toBeDefined();
    expect(getStateInfo("CA")).toBeDefined();
    expect(getStateInfo("Ca")).toBeDefined();
  });

  it("returns undefined for invalid state", () => {
    expect(getStateInfo("XX")).toBeUndefined();
  });

  it("versions audited numeric calculation profiles by tax year", () => {
    expect(getStateCalculationInfo("CA", 2024)?.taxYear).toBe(2024);
    expect(getStateCalculationInfo("CA", 2025)).toBeUndefined();
    expect(getStateCalculationInfo("IN", 2025)).toBeUndefined();
    expect(getStateCalculationInfo("IA", 2025)).toBeUndefined();
    expect(getStateCalculationInfo("MS", 2026)).toBeUndefined();
    expect(getStateCalculationInfo("MN", 2024)).toBeUndefined();
  });

  it("uses official California TY2024 FTB thresholds", () => {
    const california = getStateCalculationInfo("CA", 2024);

    expect(california?.brackets?.map(({ max }) => max)).toEqual([
      10756, 25499, 40245, 55866, 70606, 360659, 432787, 721314, 1000000, null,
    ]);
    expect(california?.marriedBrackets?.map(({ max }) => max)).toEqual([
      21512, 50998, 80490, 111732, 141212, 721318, 865574, 1000000, 1442628, null,
    ]);
  });

  it("supports no-broad-income-tax profiles for applicable years", () => {
    expect(getStateCalculationInfo("TX", 2024)?.taxType).toBe("none");
    expect(getStateCalculationInfo("TX", 2025)?.taxType).toBe("none");
    expect(getStateCalculationInfo("TX", 2026)?.taxType).toBe("none");
    expect(getStateCalculationInfo("NH", 2024)).toBeUndefined();
    expect(getStateCalculationInfo("NH", 2025)?.taxType).toBe("none");
  });

  it("no-tax states have topRate of 0", () => {
    for (const state of getNoIncomeTaxStates()) {
      expect(state.topRate).toBe(0);
    }
  });
});
