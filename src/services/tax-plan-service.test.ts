import { describe, expect, it } from "vitest";
import { buildTaxPlan } from "./tax-plan-service.js";
import type { TaxpayerFacts } from "../facts/taxpayer-facts.js";

const OPTIONS = { modelInvoked: false };

describe("buildTaxPlan employee FICA", () => {
  it("applies the Social Security wage base to each spouse", () => {
    const facts: TaxpayerFacts = {
      taxYear: 2026,
      filingStatus: "married_filing_jointly",
      income: { w2: 360000, spouseW2: 180000 },
    };
    // 2 x ($180,000 x 6.2% + $180,000 x 1.45%) = $27,540
    expect(buildTaxPlan(facts, OPTIONS).plan.results.employeeFica).toBe(27540);
  });

  it("caps a single earner at one wage base", () => {
    const facts: TaxpayerFacts = {
      taxYear: 2026,
      filingStatus: "married_filing_jointly",
      income: { w2: 360000 },
    };
    // $184,500 x 6.2% + $360,000 x 1.45% = $16,659
    expect(buildTaxPlan(facts, OPTIONS).plan.results.employeeFica).toBe(16659);
  });

  it("taxes the spouse's self-employment income on the spouse's own wage base", () => {
    const facts: TaxpayerFacts = {
      taxYear: 2026,
      filingStatus: "married_filing_jointly",
      income: { w2: 150000, selfEmployment: 100000, spouseSelfEmployment: 100000 },
    };
    // $92,350 x 15.3% = $14,129.55
    expect(buildTaxPlan(facts, OPTIONS).plan.results.selfEmploymentTax).toBeCloseTo(14129.55, 2);
  });
});

describe("buildTaxPlan state warnings", () => {
  it("does not claim TY2026 HoH state estimates use the single profile", () => {
    const facts: TaxpayerFacts = {
      taxYear: 2026,
      filingStatus: "head_of_household",
      income: { w2: 90000 },
      stateCode: "CA",
    };
    const { warnings } = buildTaxPlan(facts, OPTIONS).plan;
    expect(warnings.some((warning) => warning.includes("single state profile"))).toBe(false);
  });
});
