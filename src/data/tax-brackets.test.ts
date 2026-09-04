import { describe, it, expect } from "vitest";
import { TAX_DATA, SUPPORTED_TAX_YEARS, getTaxYearData, getSaltCap, type FilingStatus } from "./tax-brackets.js";

const STATUSES: FilingStatus[] = [
  "single",
  "married_filing_jointly",
  "married_filing_separately",
  "head_of_household",
];

describe("tax brackets data integrity", () => {
  it("supports TY2024 through TY2026", () => {
    expect(SUPPORTED_TAX_YEARS).toContain(2024);
    expect(SUPPORTED_TAX_YEARS).toContain(2025);
    expect(SUPPORTED_TAX_YEARS).toContain(2026);
  });

  for (const year of [2024, 2025, 2026]) {
    describe(`TY${year}`, () => {
      const data = TAX_DATA[year];

      it("has 7 brackets for each filing status", () => {
        for (const status of STATUSES) {
          expect(data.brackets[status]).toHaveLength(7);
        }
      });

      it("brackets start at 0 and are contiguous", () => {
        for (const status of STATUSES) {
          const brackets = data.brackets[status];
          expect(brackets[0].min).toBe(0);
          for (let i = 1; i < brackets.length; i++) {
            expect(brackets[i].min).toBe(brackets[i - 1].max);
          }
          expect(brackets[brackets.length - 1].max).toBeNull();
        }
      });

      it("rates increase monotonically from 10% to 37%", () => {
        for (const status of STATUSES) {
          const rates = data.brackets[status].map((b) => b.rate);
          expect(rates[0]).toBe(0.10);
          expect(rates[rates.length - 1]).toBe(0.37);
          for (let i = 1; i < rates.length; i++) {
            expect(rates[i]).toBeGreaterThan(rates[i - 1]);
          }
        }
      });

      it("has standard deduction for all statuses", () => {
        for (const status of STATUSES) {
          expect(data.standardDeduction[status]).toBeGreaterThan(0);
        }
      });

      it("MFJ standard deduction is ~2x single", () => {
        const ratio = data.standardDeduction.married_filing_jointly / data.standardDeduction.single;
        expect(ratio).toBeCloseTo(2, 0);
      });

      it("has capital gains brackets (0%, 15%, 20%)", () => {
        for (const status of STATUSES) {
          const rates = data.capitalGainsBrackets[status].map((b) => b.rate);
          expect(rates).toEqual([0, 0.15, 0.20]);
        }
      });

      it("has valid Social Security wage base", () => {
        expect(data.socialSecurity.wageBase).toBeGreaterThan(160000);
        expect(data.socialSecurity.taxRate).toBe(0.062);
      });

      it("has valid Medicare rates", () => {
        expect(data.medicare.taxRate).toBe(0.0145);
        expect(data.medicare.additionalTaxRate).toBe(0.009);
      });

      it("CTC amount matches tax year", () => {
        const expected = year === 2024 ? 2000 : 2200;
        expect(data.childTaxCredit.amount).toBe(expected);
        expect(data.childTaxCredit.refundableAmount).toBe(1700);
        expect(data.childTaxCredit.otherDependentAmount).toBe(500);
        expect(data.childTaxCredit.earnedIncomeThreshold).toBe(2500);
        expect(data.childTaxCredit.refundableRate).toBe(0.15);
      });
    });
  }

  it("TY2025 standard deductions are higher than TY2024", () => {
    for (const status of STATUSES) {
      expect(TAX_DATA[2025].standardDeduction[status]).toBeGreaterThan(
        TAX_DATA[2024].standardDeduction[status]
      );
    }
  });

  describe("TY2026 official values", () => {
    it("uses Rev. Proc. 2025-32 ordinary and capital-gains thresholds", () => {
      const data = TAX_DATA[2026];

      expect(data.brackets.single.map(({ max }) => max)).toEqual([
        12400, 50400, 105700, 201775, 256225, 640600, null,
      ]);
      expect(data.brackets.married_filing_jointly.map(({ max }) => max)).toEqual([
        24800, 100800, 211400, 403550, 512450, 768700, null,
      ]);
      expect(data.brackets.married_filing_separately.map(({ max }) => max)).toEqual([
        12400, 50400, 105700, 201775, 256225, 384350, null,
      ]);
      expect(data.brackets.head_of_household.map(({ max }) => max)).toEqual([
        17700, 67450, 105700, 201750, 256200, 640600, null,
      ]);
      expect(data.capitalGainsBrackets.single.map(({ threshold }) => threshold)).toEqual([
        49450, 545500, Infinity,
      ]);
      expect(data.capitalGainsBrackets.married_filing_jointly.map(({ threshold }) => threshold)).toEqual([
        98900, 613700, Infinity,
      ]);
    });

    it("uses TY2026 deductions, credits, payroll, AMT, and SALT values", () => {
      const data = TAX_DATA[2026];

      expect(data.standardDeduction).toEqual({
        single: 16100,
        married_filing_jointly: 32200,
        married_filing_separately: 16100,
        head_of_household: 24150,
      });
      expect(data.additionalDeduction.age65OrBlind).toEqual({
        single: 2050,
        married_filing_jointly: 1650,
        married_filing_separately: 1650,
        head_of_household: 2050,
      });
      expect(data.socialSecurity.wageBase).toBe(184500);
      expect(data.childTaxCredit.amount).toBe(2200);
      expect(data.childTaxCredit.refundableAmount).toBe(1700);
      expect(data.amt.exemption).toEqual({
        single: 90100,
        married_filing_jointly: 140200,
        married_filing_separately: 70100,
        head_of_household: 90100,
      });
      expect(data.amt.phaseoutStart).toEqual({
        single: 500000,
        married_filing_jointly: 1000000,
        married_filing_separately: 500000,
        head_of_household: 500000,
      });
      expect(data.amt.rate28Threshold.married_filing_separately).toBe(122250);
      expect(data.amt.rate28Threshold.single).toBe(244500);
      expect(getSaltCap(2026, "single", 505000)).toBe(40400);
      expect(getSaltCap(2026, "single", 510000)).toBe(38900);
      expect(getSaltCap(2026, "married_filing_separately", 252500)).toBe(20200);
    });
  });

  describe("QBI annual thresholds", () => {
    it("uses annual Section 199A thresholds and phase-out endpoints", () => {
      expect(TAX_DATA[2024].qbiLimit.single).toEqual({ threshold: 191950, phaseoutEnd: 241950 });
      expect(TAX_DATA[2024].qbiLimit.married_filing_jointly).toEqual({ threshold: 383900, phaseoutEnd: 483900 });
      expect(TAX_DATA[2025].qbiLimit.single).toEqual({ threshold: 197300, phaseoutEnd: 247300 });
      expect(TAX_DATA[2025].qbiLimit.married_filing_jointly).toEqual({ threshold: 394600, phaseoutEnd: 494600 });
      expect(TAX_DATA[2026].qbiLimit.single).toEqual({ threshold: 201750, phaseoutEnd: 276750 });
      expect(TAX_DATA[2026].qbiLimit.married_filing_separately).toEqual({ threshold: 201775, phaseoutEnd: 276775 });
      expect(TAX_DATA[2026].qbiLimit.married_filing_jointly).toEqual({ threshold: 403500, phaseoutEnd: 553500 });
    });
  });

  it("returns undefined for unsupported year", () => {
    expect(getTaxYearData(2020)).toBeUndefined();
  });

  describe("TY2025 SALT cap phase-down", () => {
    it("reduces the enhanced cap by 30 percent of excess MAGI", () => {
      expect(getSaltCap(2025, "single", 500000)).toBe(40000);
      expect(getSaltCap(2025, "single", 510000)).toBe(37000);
      expect(getSaltCap(2025, "married_filing_jointly", 550000)).toBe(25000);
      expect(getSaltCap(2025, "head_of_household", 600000)).toBe(10000);
    });

    it("uses the MFS threshold, enhanced cap, and floor", () => {
      expect(getSaltCap(2024, "married_filing_separately", 100000)).toBe(5000);
      expect(getSaltCap(2025, "married_filing_separately", 250000)).toBe(20000);
      expect(getSaltCap(2025, "married_filing_separately", 260000)).toBe(17000);
      expect(getSaltCap(2025, "married_filing_separately", 300000)).toBe(5000);
    });
  });
});
