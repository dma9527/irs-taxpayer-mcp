import { describe, it, expect } from "vitest";
import { TAX_DATA, SUPPORTED_TAX_YEARS, getTaxYearData, type FilingStatus } from "./tax-brackets.js";

const STATUSES: FilingStatus[] = [
  "single",
  "married_filing_jointly",
  "married_filing_separately",
  "head_of_household",
];

describe("tax brackets data integrity", () => {
  it("supports TY2024 and TY2025", () => {
    expect(SUPPORTED_TAX_YEARS).toContain(2024);
    expect(SUPPORTED_TAX_YEARS).toContain(2025);
  });

  for (const year of [2024, 2025]) {
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
        const expected = year === 2024 ? 2000 : 2200; // OBBB: $2,200 for TY2025+
        expect(data.childTaxCredit.amount).toBe(expected);
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

  it("returns undefined for unsupported year", () => {
    expect(getTaxYearData(2020)).toBeUndefined();
  });
});
