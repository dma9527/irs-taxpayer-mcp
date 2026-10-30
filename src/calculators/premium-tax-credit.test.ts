import { describe, expect, it } from "vitest";
import { calculatePremiumTaxCredit } from "./premium-tax-credit.js";

describe("calculatePremiumTaxCredit (TY2026, Rev. Proc. 2025-25)", () => {
  it("uses the 6.60% figure at exactly 200% of the poverty line", () => {
    // $31,300 / $15,650 = 200%; contribution 31,300 x 6.60% = 2,066; PTC min(5,000, 6,000 - 2,066).
    const result = calculatePremiumTaxCredit({
      taxYear: 2026, filingStatus: "single", householdIncome: 31300, familySize: 1,
      annualEnrollmentPremium: 5000, annualBenchmarkPremium: 6000, advancePayments: 4500,
    });
    expect(result.povertyLinePercent).toBe(200);
    expect(result.applicableFigure).toBe(0.066);
    expect(result.annualContribution).toBe(2066);
    expect(result.premiumTaxCredit).toBe(3934);
    expect(result.excessAdvanceRepayment).toBe(566);
    expect(result.netPremiumTaxCredit).toBe(0);
  });

  it("interpolates within the 250% to 300% band", () => {
    // Family of 2 FPL $21,150; $58,163 is 275%; 8.44% + 1.52% x 25/50 = 9.20%.
    const result = calculatePremiumTaxCredit({
      taxYear: 2026, filingStatus: "married_filing_jointly", householdIncome: 58163, familySize: 2,
      annualEnrollmentPremium: 14000, annualBenchmarkPremium: 15000, advancePayments: 0,
    });
    expect(result.povertyLinePercent).toBe(275);
    expect(result.applicableFigure).toBe(0.092);
    expect(result.annualContribution).toBe(5351);
    expect(result.premiumTaxCredit).toBe(9649);
    expect(result.netPremiumTaxCredit).toBe(9649);
  });

  it("truncates the poverty-line percentage as Form 8962 Worksheet 2 requires", () => {
    // $62,656 / $15,650 = 400.35%, entered as 400, which is not more than 400%.
    const result = calculatePremiumTaxCredit({
      taxYear: 2026, filingStatus: "single", householdIncome: 62656, familySize: 1,
      annualEnrollmentPremium: 9000, annualBenchmarkPremium: 9000, advancePayments: 0,
    });
    expect(result.eligible).toBe(true);
    expect(result.povertyLinePercent).toBe(400);
    expect(result.annualContribution).toBe(6241);
  });

  it("requires full repayment above 400% because TY2026 removes the repayment caps", () => {
    const result = calculatePremiumTaxCredit({
      taxYear: 2026, filingStatus: "single", householdIncome: 62760, familySize: 1,
      annualEnrollmentPremium: 9000, annualBenchmarkPremium: 9000, advancePayments: 3000,
    });
    expect(result.eligible).toBe(false);
    expect(result.povertyLinePercent).toBe(401);
    expect(result.premiumTaxCredit).toBe(0);
    expect(result.excessAdvanceRepayment).toBe(3000);
  });

  it("treats income below 100% of the poverty line as ineligible", () => {
    const result = calculatePremiumTaxCredit({
      taxYear: 2026, filingStatus: "single", householdIncome: 12000, familySize: 1,
      annualEnrollmentPremium: 5000, annualBenchmarkPremium: 6000, advancePayments: 0,
    });
    expect(result.eligible).toBe(false);
    expect(result.reason).toContain("100%");
  });

  it("fails closed for years, states, and filing statuses that are not modeled", () => {
    const base = {
      filingStatus: "single" as const, householdIncome: 40000, familySize: 1,
      annualEnrollmentPremium: 5000, annualBenchmarkPremium: 6000, advancePayments: 0,
    };
    expect(() => calculatePremiumTaxCredit({ ...base, taxYear: 2025 })).toThrow("TY2025");
    expect(() => calculatePremiumTaxCredit({ ...base, taxYear: 2026, povertyLineRegion: "alaska" })).toThrow("Alaska");
    expect(() => calculatePremiumTaxCredit({ ...base, taxYear: 2026, filingStatus: "married_filing_separately" }))
      .toThrow("married filing separately");
  });
});
