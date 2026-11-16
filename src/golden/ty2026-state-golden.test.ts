import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { calculateStateTax, UnsupportedStateTaxCalculationError } from "../calculators/state-tax-calculator.js";

const FixtureSchema = z.object({
  taxYear: z.literal(2026),
  cases: z.array(z.object({
    name: z.string(),
    facts: z.object({
      state: z.string(),
      status: z.enum(["single", "married_filing_jointly", "married_filing_separately", "head_of_household"]),
      income: z.number(),
      federalTaxableIncome: z.number().optional(),
    }).strict(),
    expected: z.union([
      z.object({ tax: z.number(), adjustedIncome: z.number() }).strict(),
      z.object({ unsupported: z.literal(true) }).strict(),
    ]),
    worksheet: z.array(z.string()),
  })),
});

const fixture = FixtureSchema.parse(
  JSON.parse(readFileSync(new URL("./ty2026-state-golden.json", import.meta.url), "utf8")),
);

describe("TY2026 state golden cases (scripts/golden/state_worksheet_ty2026.py)", () => {
  it("covers every TY2026 profile and the fail-closed states", () => {
    expect(new Set(fixture.cases.map(({ facts }) => facts.state)).size).toBe(29);
  });

  it.each(fixture.cases.map((testCase) => [testCase.name, testCase] as const))("%s", (_name, { facts, expected }) => {
    const run = () => calculateStateTax({
      stateCode: facts.state,
      taxYear: 2026,
      incomeBeforeDeductions: facts.income,
      filingStatus: facts.status,
      federalTaxableIncome: facts.federalTaxableIncome,
    });
    if ("unsupported" in expected) {
      expect(run).toThrow(UnsupportedStateTaxCalculationError);
      return;
    }
    const result = run();
    expect(result?.tax).toBe(expected.tax);
    expect(result?.adjustedIncome).toBe(expected.adjustedIncome);
  });
});
