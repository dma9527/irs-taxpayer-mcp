import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { calculateTax } from "../calculators/tax-calculator.js";
import { calculateEITC } from "../calculators/eitc-calculator.js";
import { getSaltCap } from "../data/tax-brackets.js";

const FactsSchema = z.object({
  status: z.enum(["single", "married_filing_jointly", "married_filing_separately", "head_of_household"]),
  wages: z.number().optional(),
  se: z.number().optional(),
  interest: z.number().optional(),
  odiv: z.number().optional(),
  qdiv: z.number().optional(),
  ltcg: z.number().optional(),
  kids: z.number().optional(),
  age65: z.boolean().optional(),
  spouse65: z.boolean().optional(),
  tips: z.number().optional(),
  overtime: z.number().optional(),
  vehicle: z.number().optional(),
  salt: z.number().optional(),
  mortgage: z.number().optional(),
  charity: z.number().optional(),
  cash_charity: z.number().optional(),
  care: z.number().optional(),
  care_kids: z.number().optional(),
  spouse_wages: z.number().optional(),
  eitc_kids: z.number().nullable().optional(),
}).strict();

const ExpectedSchema = z.object({
  adjustedGrossIncome: z.number(),
  taxableIncome: z.number(),
  amt: z.number(),
  dependentCareCredit: z.number(),
  childTaxCredit: z.number(),
  additionalChildTaxCredit: z.number(),
  selfEmploymentTax: z.number(),
  additionalMedicareTax: z.number(),
  niit: z.number(),
  totalFederalTax: z.number(),
  eitc: z.number().optional(),
}).strict();

const FixtureSchema = z.object({
  taxYear: z.literal(2026),
  cases: z.array(z.object({
    name: z.string(),
    facts: FactsSchema,
    expected: ExpectedSchema,
    worksheet: z.array(z.string()),
  })),
});

const fixture = FixtureSchema.parse(
  JSON.parse(readFileSync(new URL("./ty2026-golden.json", import.meta.url), "utf8")),
);

describe("TY2026 golden worksheet cases (scripts/golden/worksheet_ty2026.py)", () => {
  it("covers 50 hand-worked cases", () => {
    expect(fixture.cases).toHaveLength(50);
  });

  it.each(fixture.cases.map((testCase) => [testCase.name, testCase] as const))("%s", (_name, testCase) => {
    const { facts, expected } = testCase;
    const wages = facts.wages ?? 0;
    const selfEmployment = facts.se ?? 0;
    const interest = facts.interest ?? 0;
    const dividends = facts.odiv ?? 0;
    const longTermGain = facts.ltcg ?? 0;
    const grossIncome = wages + selfEmployment + interest + dividends + longTermGain;
    const hasItemized = Boolean(facts.salt || facts.mortgage || facts.charity);
    const cappedSalt = Math.min(facts.salt ?? 0, getSaltCap(2026, facts.status, expected.adjustedGrossIncome));
    const seniorCount = Number(facts.age65 ?? false) + Number(facts.spouse65 ?? false);
    const earnedIncome = wages + selfEmployment - expected.selfEmploymentTax / 2;

    const result = calculateTax({
      taxYear: 2026,
      filingStatus: facts.status,
      grossIncome,
      w2Income: wages,
      selfEmploymentIncome: selfEmployment || undefined,
      capitalGains: longTermGain || undefined,
      capitalGainsLongTerm: true,
      qualifiedDividends: facts.qdiv,
      netInvestmentIncome: interest + dividends + longTermGain,
      itemizedDeductions: hasItemized ? cappedSalt + (facts.mortgage ?? 0) + (facts.charity ?? 0) : undefined,
      itemizedCharitableContributions: facts.charity,
      stateTaxDeducted: hasItemized ? cappedSalt : undefined,
      charitableCashContributions: facts.cash_charity,
      qualifyingChildrenForCtc: facts.kids,
      earnedIncome,
      age65OrOlder: facts.age65,
      spouseAge65OrOlder: facts.spouse65,
      qualifiedTips: facts.tips,
      qualifiedOvertimeCompensation: facts.overtime,
      qualifiedVehicleLoanInterest: facts.vehicle,
      dependentCareExpenses: facts.care,
      dependentCareQualifyingIndividuals: facts.care_kids,
      spouseEarnedIncome: facts.spouse_wages,
    });

    const within = (actual: number, target: number, label: string) =>
      expect(Math.abs(actual - target), `${label}: engine ${actual} vs worksheet ${target}`).toBeLessThanOrEqual(1);
    within(result.adjustedGrossIncome, expected.adjustedGrossIncome, "AGI");
    within(result.taxableIncome, expected.taxableIncome, "taxable income");
    within(result.amt, expected.amt, "AMT");
    within(result.dependentCareCredit, expected.dependentCareCredit, "dependent care credit");
    within(result.childTaxCredit, expected.childTaxCredit, "CTC");
    within(result.additionalChildTaxCredit, expected.additionalChildTaxCredit, "ACTC");
    within(result.selfEmploymentTax, expected.selfEmploymentTax, "SE tax");
    within(result.additionalMedicareTax, expected.additionalMedicareTax, "Additional Medicare Tax");
    within(result.niit, expected.niit, "NIIT");
    within(result.totalFederalTax, expected.totalFederalTax, "total federal tax");
    expect(seniorCount === 0 || result.scheduleOneADeductions.senior > 0).toBe(true);

    if (expected.eitc !== undefined) {
      const eitc = calculateEITC({
        taxYear: 2026,
        filingStatus: facts.status,
        earnedIncome,
        agi: result.adjustedGrossIncome,
        qualifyingChildren: facts.eitc_kids ?? 0,
        investmentIncome: interest + dividends + longTermGain,
      });
      within(eitc.credit, expected.eitc, "EITC");
    }
  });
});
