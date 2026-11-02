import { describe, expect, it } from "vitest";
import { getSaversCreditAgiLimit, getStudentLoanInterestPhaseout } from "./phaseout-limits.js";
import type { FilingStatus } from "./tax-brackets.js";

describe("getStudentLoanInterestPhaseout", () => {
  it.each<[number, FilingStatus, { start: number; end: number }]>([
    [2024, "single", { start: 80000, end: 95000 }],
    [2024, "married_filing_jointly", { start: 165000, end: 195000 }],
    [2025, "single", { start: 85000, end: 100000 }],
    [2025, "married_filing_jointly", { start: 170000, end: 200000 }],
    [2026, "head_of_household", { start: 85000, end: 100000 }],
    [2026, "married_filing_jointly", { start: 175000, end: 205000 }],
  ])("returns the TY%i %s range", (taxYear, filingStatus, expected) => {
    expect(getStudentLoanInterestPhaseout(taxYear, filingStatus)).toEqual(expected);
  });

  it("returns null for married filing separately", () => {
    expect(getStudentLoanInterestPhaseout(2026, "married_filing_separately")).toBeNull();
  });

  it("throws for an unsupported year", () => {
    expect(() => getStudentLoanInterestPhaseout(2023, "single")).toThrow("TY2023");
  });
});

describe("getSaversCreditAgiLimit", () => {
  it.each<[number, FilingStatus, number]>([
    [2024, "single", 38250],
    [2024, "head_of_household", 57375],
    [2024, "married_filing_jointly", 76500],
    [2025, "married_filing_separately", 39500],
    [2025, "head_of_household", 59250],
    [2025, "married_filing_jointly", 79000],
    [2026, "single", 40250],
    [2026, "head_of_household", 60375],
    [2026, "married_filing_jointly", 80500],
  ])("returns the TY%i %s limit", (taxYear, filingStatus, expected) => {
    expect(getSaversCreditAgiLimit(taxYear, filingStatus)).toBe(expected);
  });

  it("throws for an unsupported year", () => {
    expect(() => getSaversCreditAgiLimit(2027, "single")).toThrow("TY2027");
  });
});
