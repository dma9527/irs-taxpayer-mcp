import { describe, it, expect } from "vitest";
import { STATE_TAX_DATA, getStateInfo, getNoIncomeTaxStates } from "./state-taxes.js";

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

  it("no-tax states have topRate of 0", () => {
    for (const state of getNoIncomeTaxStates()) {
      expect(state.topRate).toBe(0);
    }
  });
});
