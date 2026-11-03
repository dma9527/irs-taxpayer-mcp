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

  it("uses the 2025 HHS Alaska and Hawaii poverty lines", () => {
    // Alaska $19,550; $39,100 is 200%; contribution 39,100 x 6.60% = 2,581; PTC min(8,000, 9,000 - 2,581).
    const alaska = calculatePremiumTaxCredit({
      taxYear: 2026, filingStatus: "single", householdIncome: 39100, familySize: 1,
      annualEnrollmentPremium: 8000, annualBenchmarkPremium: 9000, advancePayments: 6000,
      povertyLineRegion: "alaska",
    });
    expect(alaska.povertyLine).toBe(19550);
    expect(alaska.povertyLinePercent).toBe(200);
    expect(alaska.premiumTaxCredit).toBe(6419);
    expect(alaska.netPremiumTaxCredit).toBe(419);

    // Hawaii family of 2: $17,990 + $6,330 = $24,320; $48,640 is 200%; contribution 3,210.
    const hawaii = calculatePremiumTaxCredit({
      taxYear: 2026, filingStatus: "married_filing_jointly", householdIncome: 48640, familySize: 2,
      annualEnrollmentPremium: 12000, annualBenchmarkPremium: 12000, advancePayments: 8790,
      povertyLineRegion: "hawaii",
    });
    expect(hawaii.povertyLine).toBe(24320);
    expect(hawaii.annualContribution).toBe(3210);
    expect(hawaii.premiumTaxCredit).toBe(8790);
    expect(hawaii.excessAdvanceRepayment).toBe(0);
  });

  it("fails closed for years that are not modeled", () => {
    const base = {
      filingStatus: "single" as const, householdIncome: 40000, familySize: 1,
      annualEnrollmentPremium: 5000, annualBenchmarkPremium: 6000, advancePayments: 0,
    };
    expect(() => calculatePremiumTaxCredit({ ...base, taxYear: 2025 })).toThrow("TY2025");
  });

  it("requires full repayment for married filing separately without Exception 2", () => {
    const result = calculatePremiumTaxCredit({
      taxYear: 2026, filingStatus: "married_filing_separately", householdIncome: 31300, familySize: 1,
      annualEnrollmentPremium: 5000, annualBenchmarkPremium: 6000, advancePayments: 4500,
    });
    expect(result.eligible).toBe(false);
    expect(result.premiumTaxCredit).toBe(0);
    expect(result.excessAdvanceRepayment).toBe(4500);
    expect(result.reason).toContain("Exception 2");
  });

  it("allows married filing separately under Exception 2 (domestic abuse or spousal abandonment)", () => {
    const result = calculatePremiumTaxCredit({
      taxYear: 2026, filingStatus: "married_filing_separately", householdIncome: 31300, familySize: 1,
      annualEnrollmentPremium: 5000, annualBenchmarkPremium: 6000, advancePayments: 4500,
      marriedFilingSeparatelyException2: true,
    });
    expect(result.premiumTaxCredit).toBe(3934);
    expect(result.excessAdvanceRepayment).toBe(566);
  });

  it("applies the below-100% exception when the Marketplace estimate was at least 100% and APTC was paid", () => {
    // $12,000 / $15,650 = 76%; figure 2.10%; contribution 252; PTC min(5,000, 6,000 - 252).
    const result = calculatePremiumTaxCredit({
      taxYear: 2026, filingStatus: "single", householdIncome: 12000, familySize: 1,
      annualEnrollmentPremium: 5000, annualBenchmarkPremium: 6000, advancePayments: 3000,
      marketplaceEstimatedAtLeast100Percent: true,
    });
    expect(result.eligible).toBe(true);
    expect(result.applicableFigure).toBe(0.021);
    expect(result.annualContribution).toBe(252);
    expect(result.premiumTaxCredit).toBe(5000);
    expect(result.netPremiumTaxCredit).toBe(2000);
  });

  it("does not apply the below-100% exception when no APTC was paid", () => {
    const result = calculatePremiumTaxCredit({
      taxYear: 2026, filingStatus: "single", householdIncome: 12000, familySize: 1,
      annualEnrollmentPremium: 5000, annualBenchmarkPremium: 6000, advancePayments: 0,
      marketplaceEstimatedAtLeast100Percent: true,
    });
    expect(result.eligible).toBe(false);
  });

  it("allocates by month for part-year coverage (Form 8962 lines 12 to 23)", () => {
    // Line 8a 2,066; line 8b 2,066 / 12 = 172; six months of min(500, 600 - 172) = 2,568.
    const covered = { enrollmentPremium: 500, benchmarkPremium: 600, advancePayment: 420 };
    const uncovered = { enrollmentPremium: 0, benchmarkPremium: 0, advancePayment: 0 };
    const result = calculatePremiumTaxCredit({
      taxYear: 2026, filingStatus: "single", householdIncome: 31300, familySize: 1,
      annualEnrollmentPremium: 0, annualBenchmarkPremium: 0, advancePayments: 0,
      monthly: [...Array<typeof covered>(6).fill(covered), ...Array<typeof uncovered>(6).fill(uncovered)],
    });
    expect(result.monthlyContribution).toBe(172);
    expect(result.premiumTaxCredit).toBe(2568);
    expect(result.advancePayments).toBe(2520);
    expect(result.netPremiumTaxCredit).toBe(48);
  });

  it("rejects monthly amounts that do not cover 12 months", () => {
    expect(() => calculatePremiumTaxCredit({
      taxYear: 2026, filingStatus: "single", householdIncome: 31300, familySize: 1,
      annualEnrollmentPremium: 0, annualBenchmarkPremium: 0, advancePayments: 0,
      monthly: [{ enrollmentPremium: 500, benchmarkPremium: 600, advancePayment: 420 }],
    })).toThrow("12 months");
  });
});
