/**
 * Integration tests for all MCP tools.
 * Tests the tool registration and execution through the MCP server.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { registerTaxCalculationTools } from "./tax-calculation-tools.js";
import { registerDeductionTools } from "./deduction-tools.js";
import { registerIrsLookupTools } from "./irs-lookup-tools.js";
import { registerCreditTools } from "./credit-tools.js";
import { registerStateTaxTools } from "./state-tax-tools.js";
import { registerPlanningTools } from "./planning-tools.js";
import { registerObbbTools } from "./obbb-tools.js";
import { registerComprehensiveTools } from "./comprehensive-tools.js";
import { registerAdvancedTools } from "./advanced-tools.js";
import { registerSmartTools } from "./smart-tools.js";

import { registerTaxPlanTools } from "./tax-plan-tools.js";
import { SERVER_VERSION } from "../version.js";
// Helper to call a tool on the server
async function callTool(
  server: McpServer,
  name: string,
  args: Record<string, unknown>
): Promise<{
  text: string;
  isError?: boolean;
  structuredContent?: Record<string, unknown>;
}> {
  const serverInternal = server as unknown as {
    _registeredTools: Record<string, { handler: (args: Record<string, unknown>, extra: unknown) => Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean; structuredContent?: Record<string, unknown> }> }>;
  };
  const tool = serverInternal._registeredTools[name];
  if (!tool) throw new Error(`Tool "${name}" not found`);
  const result = await tool.handler(args, {});
  const text = result.content.map((c) => c.text).join("\n");
  return {
    text,
    isError: result.isError,
    structuredContent: result.structuredContent,
  };
}

describe("MCP Tools Integration", () => {
  let server: McpServer;

  beforeAll(() => {
    server = new McpServer({ name: "test", version: "0.0.1" });
    registerTaxCalculationTools(server);
    registerDeductionTools(server);
    registerIrsLookupTools(server);
    registerCreditTools(server);
    registerStateTaxTools(server);
    registerPlanningTools(server);
    registerObbbTools(server);
    registerComprehensiveTools(server);
    registerAdvancedTools(server);
    registerSmartTools(server);
    registerTaxPlanTools(server);
  });

  // --- Tax Calculation Tools ---
  describe("calculate_federal_tax", () => {
    it("returns tax breakdown for basic input", async () => {
      const { text } = await callTool(server, "calculate_federal_tax", {
        taxYear: 2024, filingStatus: "single", grossIncome: 100000,
      });
      expect(text).toContain("Federal Tax Calculation");
      expect(text).toContain("Effective Tax Rate");
      expect(text).toContain("Marginal Tax Rate");
    });

    it("uses official TY2026 federal values", async () => {
      const { text } = await callTool(server, "calculate_federal_tax", {
        taxYear: 2026, filingStatus: "single", grossIncome: 100000,
      });

      expect(text).toContain("TY2026");
      expect(text).toContain("$16,100");
      expect(text).toContain("$13,170");
    });

    it("reports limited capital loss and carryforward", async () => {
      const { text } = await callTool(server, "calculate_federal_tax", {
        taxYear: 2024,
        filingStatus: "single",
        grossIncome: 90000,
        w2Income: 100000,
        capitalGains: -10000,
      });

      expect(text).toContain("Capital Loss Deduction | -$3,000");
      expect(text).toContain("Long-Term Capital Loss Carryforward | $7,000");
    });

    it("applies QBI wage and property limits above the threshold", async () => {
      const { text } = await callTool(server, "calculate_federal_tax", {
        taxYear: 2024,
        filingStatus: "single",
        grossIncome: 300000,
        qualifiedBusinessIncome: 100000,
        qualifiedBusinessIsSstb: false,
        qualifiedBusinessW2Wages: 20000,
        qualifiedBusinessPropertyBasis: 0,
      });

      expect(text).toContain("QBI Deduction (§199A) | -$10,000");
      expect(text).toContain("QBI Method | wage_property_limited");
    });

    it("fails closed when high-income QBI facts are missing", async () => {
      const { text, isError } = await callTool(server, "calculate_federal_tax", {
        taxYear: 2024,
        filingStatus: "single",
        grossIncome: 300000,
        qualifiedBusinessIncome: 100000,
      });

      expect(isError).toBe(true);
      expect(text).toContain("qualifiedBusinessIsSstb");
    });

    it("applies preferential capital-gain rates under AMT", async () => {
      const { text } = await callTool(server, "calculate_federal_tax", {
        taxYear: 2024,
        filingStatus: "single",
        grossIncome: 1000000,
        w2Income: 100000,
        capitalGains: 900000,
      });

      expect(text).toContain("Alternative Minimum Tax (AMT) | $12,159");
    });

    it("calculates taxable Social Security benefits", async () => {
      const { text } = await callTool(server, "calculate_federal_tax", {
        taxYear: 2025,
        filingStatus: "single",
        grossIncome: 34970,
        socialSecurityBenefits: 5980,
      });

      expect(text).toContain("Taxable Social Security Benefits | $2,990");
    });

    it("calculates taxable retirement distributions and early tax", async () => {
      const { text } = await callTool(server, "calculate_federal_tax", {
        taxYear: 2025,
        filingStatus: "single",
        grossIncome: 80000,
        w2Income: 50000,
        retirementDistributions: 30000,
        taxableRetirementDistributions: 20000,
        earlyRetirementDistributionSubjectToPenalty: 10000,
      });

      expect(text).toContain("Taxable Retirement Distributions | $20,000");
      expect(text).toContain("Early Retirement Distribution Additional Tax | $1,000");
    });

    it("calculates refundable and nonrefundable education credits", async () => {
      const { text } = await callTool(server, "calculate_federal_tax", {
        taxYear: 2025,
        filingStatus: "single",
        grossIncome: 40000,
        aotcStudentQualifiedExpenses: [4000],
        aotcRefundableAllowed: true,
        lifetimeLearningQualifiedExpenses: 5000,
      });

      expect(text).toContain("American Opportunity Credit (nonrefundable) | -$1,500");
      expect(text).toContain("American Opportunity Credit (refundable) | -$1,000");
      expect(text).toContain("Lifetime Learning Credit | -$1,000");
    });

    it("returns error for unsupported year", async () => {
      const { text, isError } = await callTool(server, "calculate_federal_tax", {
        taxYear: 2020, filingStatus: "single", grossIncome: 50000,
      });
      expect(isError).toBe(true);
      expect(text).toContain("not supported");
    });
  });

  describe("get_tax_brackets", () => {
    it("returns brackets for TY2024 single", async () => {
      const { text } = await callTool(server, "get_tax_brackets", {
        taxYear: 2024, filingStatus: "single",
      });
      expect(text).toContain("Tax Brackets");
      expect(text).toContain("10%");
      expect(text).toContain("37%");
    });
  });

  describe("compare_filing_statuses", () => {
    it("compares all statuses", async () => {
      const { text } = await callTool(server, "compare_filing_statuses", {
        taxYear: 2024, grossIncome: 100000,
      });
      expect(text).toContain("Filing Status Comparison");
      expect(text).toContain("single");
      expect(text).toContain("married filing jointly");
    });
  });

  describe("estimate_quarterly_tax", () => {
    it("returns quarterly estimate", async () => {
      const { text } = await callTool(server, "estimate_quarterly_tax", {
        taxYear: 2024, filingStatus: "single", expectedAnnualIncome: 80000,
      });
      expect(text).toContain("Quarterly");
      expect(text).toContain("Safe harbor");
    });
  });

  describe("calculate_total_tax", () => {
    it("returns combined federal + state", async () => {
      const { text } = await callTool(server, "calculate_total_tax", {
        taxYear: 2024, filingStatus: "single", grossIncome: 100000, stateCode: "CA",
      });
      expect(text).toContain("Total Tax Summary");
      expect(text).toContain("California");
      expect(text).toContain("Take-Home");
    });

    it("handles no-tax state", async () => {
      const { text } = await callTool(server, "calculate_total_tax", {
        taxYear: 2024, filingStatus: "single", grossIncome: 100000, stateCode: "TX",
      });
      expect(text).toContain("Texas");
      expect(text).toContain("$0");
    });
  });

  describe("calculate_w4_withholding", () => {
    it("returns W-4 recommendations", async () => {
      const { text } = await callTool(server, "calculate_w4_withholding", {
        taxYear: 2024, filingStatus: "single", annualSalary: 75000, payFrequency: "biweekly",
      });
      expect(text).toContain("W-4 Withholding");
      expect(text).toContain("Per-Paycheck");
      expect(text).toContain("Step 1");
    });

    it("uses the year's child credit amount in Step 3 (2026 Form W-4: $2,200)", async () => {
      const ty2026 = await callTool(server, "calculate_w4_withholding", {
        taxYear: 2026, filingStatus: "married_filing_jointly", annualSalary: 120000, payFrequency: "biweekly", dependents: 2,
      });
      const ty2024 = await callTool(server, "calculate_w4_withholding", {
        taxYear: 2024, filingStatus: "married_filing_jointly", annualSalary: 120000, payFrequency: "biweekly", dependents: 2,
      });
      expect(ty2026.text).toContain("2 qualifying child(ren) × $2,200 = $4,400");
      expect(ty2024.text).toContain("2 qualifying child(ren) × $2,000 = $4,000");
    });
  });

  // --- Deduction Tools ---
  describe("list_deductions", () => {
    it("returns all deductions", async () => {
      const { text } = await callTool(server, "list_deductions", {});
      expect(text).toContain("Above-the-Line");
      expect(text).toContain("Itemized");
    });

    it("filters by category", async () => {
      const { text } = await callTool(server, "list_deductions", { category: "medical" });
      expect(text).toContain("Medical");
    });
  });

  describe("standard_vs_itemized", () => {
    it("recommends standard when itemized is lower", async () => {
      const { text } = await callTool(server, "standard_vs_itemized", {
        taxYear: 2024, filingStatus: "single", agi: 80000,
        mortgageInterest: 3000, stateLocalTaxes: 2000,
      });
      expect(text).toContain("standard");
    });

    it("applies the TY2026 charitable floor and 2/37 limit to itemized deductions", async () => {
      // Pre-limit $60,000; floor 0.5% x $1,000,000 = $5,000; limit 55,000 x 2/37 = $2,973.
      const { text } = await callTool(server, "standard_vs_itemized", {
        taxYear: 2026, filingStatus: "married_filing_jointly", agi: 1000000,
        stateLocalTaxes: 50000, mortgageInterest: 30000, charitableDonations: 20000,
      });
      expect(text).toContain("| Charitable 0.5% of AGI floor | -$5,000 |");
      expect(text).toContain("| Itemized deduction limit (2/37) | -$2,973 |");
      expect(text).toContain("| **Total Itemized** | **$52,027** |");
    });

    it("adds the TY2026 non-itemizer cash charitable deduction to the standard side", async () => {
      const { text } = await callTool(server, "standard_vs_itemized", {
        taxYear: 2026, filingStatus: "single", agi: 60000,
        charitableDonations: 3000, nonItemizerCashDonations: 1500,
      });
      expect(text).toContain("**Standard Deduction**: $16,100 + $1,000 non-itemizer charitable deduction = $17,100");
    });
  });

  // --- IRS Lookup Tools ---
  describe("get_tax_deadlines", () => {
    it("returns TY2026 deadlines by default", async () => {
      const { text, isError } = await callTool(server, "get_tax_deadlines", {});
      expect(isError).toBeFalsy();
      expect(text).toContain("TY2026");
      expect(text).toContain("2027-04-15");
    });
    it("returns deadlines for TY2024", async () => {
      const { text } = await callTool(server, "get_tax_deadlines", { taxYear: 2024 });
      expect(text).toContain("Deadlines");
      expect(text).toContain("April");
    });
  });

  describe("check_refund_status", () => {
    it("returns refund guidance", async () => {
      const { text } = await callTool(server, "check_refund_status", {});
      expect(text).toContain("Refund");
      expect(text).toContain("irs.gov");
    });
  });

  describe("get_irs_form_info", () => {
    it("returns form 1040 info", async () => {
      const { text } = await callTool(server, "get_irs_form_info", { formNumber: "1040" });
      expect(text).toContain("1040");
      expect(text).toContain("Individual Income Tax");
    });

    it("handles unknown form", async () => {
      const { text } = await callTool(server, "get_irs_form_info", { formNumber: "99999" });
      expect(text).toContain("not found");
    });
  });

  // --- Credit Tools ---
  describe("list_tax_credits", () => {
    it("returns all credits", async () => {
      const { text } = await callTool(server, "list_tax_credits", {});
      expect(text).toContain("Federal Tax Credits");
      expect(text).toContain("Child Tax Credit");
    });

    it("filters by category", async () => {
      const { text } = await callTool(server, "list_tax_credits", { category: "energy" });
      expect(text).toContain("energy");
    });
  });

  describe("check_credit_eligibility", () => {
    it("estimates the TY2026 Premium Tax Credit with full repayment of excess advance payments", async () => {
      const { text, isError } = await callTool(server, "estimate_premium_tax_credit", {
        taxYear: 2026, filingStatus: "single", householdIncome: 31300, familySize: 1,
        annualEnrollmentPremium: 5000, annualBenchmarkPremium: 6000, advancePayments: 4500,
      });
      expect(isError).toBeFalsy();
      expect(text).toContain("| Household income as % of poverty line | 200% |");
      expect(text).toContain("| Premium Tax Credit | $3,934 |");
      expect(text).toContain("| Excess advance payment to repay | $566 |");
      expect(text).toContain("Rev. Proc. 2025-25");
    });

    it("returns a typed error for an unsupported Premium Tax Credit year", async () => {
      const { isError, text } = await callTool(server, "estimate_premium_tax_credit", {
        taxYear: 2025, filingStatus: "single", householdIncome: 31300, familySize: 1,
        annualEnrollmentPremium: 5000, annualBenchmarkPremium: 6000, advancePayments: 0,
      });
      expect(isError).toBe(true);
      expect(text).toContain("TY2025");
    });

    it("uses TY2026 rules by default: $2,200 CTC and no expired energy or EV credits", async () => {
      const { text } = await callTool(server, "check_credit_eligibility", {
        agi: 90000, filingStatus: "married_filing_jointly", hasChildren: true, numChildren: 2,
        hasEarnedIncome: true, boughtEV: true, installedSolar: true, madeHomeImprovements: true,
      });
      expect(text).toContain("$4,400 (2 children × $2,200)");
      expect(text).toContain("❌ **Clean Vehicle Credit**: Not available for vehicles acquired after September 30, 2025");
      expect(text).toContain("❌ **Residential Clean Energy Credit**: Expired for expenditures after December 31, 2025");
      expect(text).toContain("❌ **Energy Efficient Home Improvement Credit**: Expired for property placed in service after December 31, 2025");
    });

    it("keeps TY2024 EV and energy credits available", async () => {
      const { text } = await callTool(server, "check_credit_eligibility", {
        taxYear: 2024, agi: 90000, filingStatus: "married_filing_jointly", hasChildren: true, numChildren: 2,
        boughtEV: true, installedSolar: true,
      });
      expect(text).toContain("$4,000 (2 children × $2,000)");
      expect(text).toContain("✅ **Clean Vehicle Credit**");
      expect(text).toContain("✅ **Residential Clean Energy Credit**");
    });

    it("uses TY2026 Saver's Credit and student loan income limits", async () => {
      const single = await callTool(server, "check_credit_eligibility", {
        agi: 40000, filingStatus: "single", hasRetirementContributions: true,
      });
      expect(single.text).toContain("Saver's Credit");
      const joint = await callTool(server, "check_credit_eligibility", {
        agi: 200000, filingStatus: "married_filing_jointly", hasStudentLoans: true,
      });
      expect(joint.text).toContain("Student Loan Interest Deduction");
    });

    it("keeps TY2024 Saver's Credit and student loan income limits", async () => {
      const single = await callTool(server, "check_credit_eligibility", {
        taxYear: 2024, agi: 39000, filingStatus: "single", hasRetirementContributions: true,
      });
      expect(single.text).not.toContain("Saver's Credit");
      const joint = await callTool(server, "check_credit_eligibility", {
        taxYear: 2024, agi: 200000, filingStatus: "married_filing_jointly", hasStudentLoans: true,
      });
      expect(joint.text).not.toContain("Student Loan Interest Deduction");
    });

    it("checks eligibility", async () => {
      const { text } = await callTool(server, "check_credit_eligibility", {
        agi: 50000, filingStatus: "single", hasChildren: true, numChildren: 1,
      });
      expect(text).toContain("Eligibility");
      expect(text).toContain("Child Tax Credit");
    });
  });

  describe("get_retirement_accounts", () => {
    it("returns all accounts", async () => {
      const { text } = await callTool(server, "get_retirement_accounts", {});
      expect(text).toContain("Retirement Accounts");
      expect(text).toContain("Roth IRA");
    });

    it("returns specific account", async () => {
      const { text } = await callTool(server, "get_retirement_accounts", { accountType: "hsa" });
      expect(text).toContain("HSA");
    });
  });

  describe("get_retirement_strategy", () => {
    it("returns all strategies", async () => {
      const { text } = await callTool(server, "get_retirement_strategy", {});
      expect(text).toContain("Backdoor Roth");
    });

    it("returns specific strategy", async () => {
      const { text } = await callTool(server, "get_retirement_strategy", { strategyId: "backdoor_roth" });
      expect(text).toContain("Backdoor Roth IRA");
    });
  });

  describe("calculate_eitc", () => {
    it("calculates EITC for eligible worker", async () => {
      const { text } = await callTool(server, "calculate_eitc", {
        taxYear: 2024, filingStatus: "single", earnedIncome: 25000, agi: 25000, qualifyingChildren: 1,
      });
      expect(text).toContain("EITC");
      expect(text).toContain("refundable");
    });

    it("uses TY2026 EITC parameters", async () => {
      const { text } = await callTool(server, "calculate_eitc", {
        taxYear: 2026,
        filingStatus: "single",
        earnedIncome: 18290,
        agi: 18290,
        qualifyingChildren: 3,
      });

      expect(text).toContain("$8,231");
    });

    it("shows ineligible for MFS", async () => {
      const { text } = await callTool(server, "calculate_eitc", {
        taxYear: 2024, filingStatus: "married_filing_separately", earnedIncome: 20000, agi: 20000, qualifyingChildren: 0,
      });
      expect(text).toContain("Not eligible");
    });
  });

  // --- State Tax Tools ---
  describe("get_state_tax_info", () => {
    it("returns CA info", async () => {
      const { text } = await callTool(server, "get_state_tax_info", { stateCode: "CA" });
      expect(text).toContain("California");
      expect(text).toContain("Graduated");
    });

    it("returns error for invalid state", async () => {
      const { text, isError } = await callTool(server, "get_state_tax_info", { stateCode: "XX" });
      expect(isError).toBe(true);
    });
  });

  describe("estimate_state_tax", () => {
    it("estimates CA tax", async () => {
      const { text } = await callTool(server, "estimate_state_tax", {
        stateCode: "CA", taxYear: 2024, taxableIncome: 100000,
      });
      expect(text).toContain("California");
      expect(text).toContain("Estimated State Tax");
    });

    it("shows zero for no-tax state", async () => {
      const { text } = await callTool(server, "estimate_state_tax", {
        stateCode: "TX", taxYear: 2024, taxableIncome: 100000,
      });
      expect(text).toContain("No State Income Tax");
    });
  });

  describe("compare_state_taxes", () => {
    it("compares multiple states", async () => {
      const { text } = await callTool(server, "compare_state_taxes", {
        states: ["CA", "TX", "FL"], taxYear: 2024, taxableIncome: 150000,
      });
      expect(text).toContain("State Tax Comparison");
      expect(text).toContain("California");
      expect(text).toContain("Texas");
    });
  });

  describe("list_no_income_tax_states", () => {
    it("lists all no-tax states", async () => {
      const { text } = await callTool(server, "list_no_income_tax_states", {});
      expect(text).toContain("No Income Tax");
      expect(text).toContain("Texas");
      expect(text).toContain("Florida");
    });
  });

  // --- Planning Tools ---
  describe("get_tax_planning_tips", () => {
    it("returns planning tips", async () => {
      const { text } = await callTool(server, "get_tax_planning_tips", {
        taxYear: 2024, filingStatus: "single", estimatedIncome: 100000,
        hasRetirementPlan: true, currentRetirementContributions: 10000,
      });
      expect(text).toContain("Tax Planning");
      expect(text).toContain("401(k)");
    });
  });

  describe("compare_tax_years", () => {
    it("compares TY2024 vs TY2025", async () => {
      const { text } = await callTool(server, "compare_tax_years", {
        filingStatus: "single", grossIncome: 100000,
      });
      expect(text).toContain("Tax Year Comparison");
      expect(text).toContain("TY2024");
      expect(text).toContain("TY2025");
    });
  });

  describe("estimate_self_employment_tax", () => {
    it("returns SE breakdown", async () => {
      const { text } = await callTool(server, "estimate_self_employment_tax", {
        taxYear: 2024, filingStatus: "single", grossRevenue: 120000, businessExpenses: 30000,
      });
      expect(text).toContain("Self-Employment");
      expect(text).toContain("Schedule C");
      expect(text).toContain("Quarterly");
    });
  });

  describe("analyze_mortgage_tax_benefit", () => {
    it("analyzes mortgage benefit", async () => {
      const { text } = await callTool(server, "analyze_mortgage_tax_benefit", {
        taxYear: 2024, filingStatus: "married_filing_jointly", grossIncome: 150000,
        mortgageInterest: 15000, propertyTaxes: 8000,
      });
      expect(text).toContain("Mortgage Tax Benefit");
      expect(text).toContain("SALT");
    });
  });

  describe("analyze_education_tax_benefits", () => {
    it("compares AOTC vs LLC", async () => {
      const { text } = await callTool(server, "analyze_education_tax_benefits", {
        filingStatus: "single", agi: 60000, tuitionPaid: 8000, isUndergrad: true,
      });
      expect(text).toContain("Education Tax Benefits");
      expect(text).toContain("AOTC");
      expect(text).toContain("Lifetime Learning");
    });

    it.each([
      [2026, "single", 92500, "$1,250"],
      [2024, "single", 87500, "$1,250"],
      [2026, "married_filing_jointly", 190000, "$1,250"],
    ])("phases out student loan interest with TY%i %s limits", async (taxYear, filingStatus, agi, deductible) => {
      const { text } = await callTool(server, "analyze_education_tax_benefits", {
        taxYear, filingStatus, agi, tuitionPaid: 0, isUndergrad: false, studentLoanInterest: 2500,
      });
      expect(text).toContain(`| Deductible Amount | ${deductible} |`);
    });
  });

  // --- OBBB Tools ---
  describe("calculate_obbb_deductions", () => {
    it("calculates OBBB deductions for TY2025", async () => {
      const { text } = await callTool(server, "calculate_obbb_deductions", {
        taxYear: 2025, filingStatus: "single", agi: 60000, age: 67, tipIncome: 15000,
      });
      expect(text).toContain("OBBB");
      expect(text).toContain("Senior Bonus");
      expect(text).toContain("Tips");
    });

    it("phases out tips in full $1,000 steps per IRC 224(b)(2)", async () => {
      // Excess $10,500 is 10 full steps: 20,000 - 1,000 = 19,000.
      const { text } = await callTool(server, "calculate_obbb_deductions", {
        taxYear: 2026, filingStatus: "single", agi: 160500, tipIncome: 20000,
      });
      expect(text).toContain("| Tips Income Deduction | $19,000 |");
    });

    it("shows not available for TY2024", async () => {
      const { text } = await callTool(server, "calculate_obbb_deductions", {
        taxYear: 2024, filingStatus: "single", agi: 50000,
      });
      expect(text).toContain("Not Available");
    });
  });

  describe("what_changed_between_tax_years", () => {
    it("separates TY2026 law changes from TY2025 changes with sources", async () => {
      const { text } = await callTool(server, "what_changed_between_tax_years", {
        fromYear: 2025, toYear: 2026,
      });
      const ty2026 = text.slice(text.indexOf("### Law Changes Effective TY2026"));
      expect(ty2026).toContain("IRC 68");
      expect(ty2026).toContain("OBBB sec. 70111");
      expect(ty2026).toContain("Not modeled");
      expect(ty2026).not.toContain("Qualified tips deduction");
      expect(text).not.toContain("### Law Changes Effective TY2025");
    });

    it("lists TY2025 and TY2026 law changes in separate sections across both years", async () => {
      const { text } = await callTool(server, "what_changed_between_tax_years", {
        fromYear: 2024, toYear: 2026,
      });
      const ty2025Start = text.indexOf("### Law Changes Effective TY2025");
      const ty2026Start = text.indexOf("### Law Changes Effective TY2026");
      expect(ty2025Start).toBeGreaterThan(-1);
      expect(ty2026Start).toBeGreaterThan(ty2025Start);
      expect(text.slice(ty2025Start, ty2026Start)).toContain("Qualified tips deduction");
      expect(text.slice(ty2026Start)).toContain("Child and Dependent Care Credit");
    });

    it("shows differences between TY2024 and TY2025", async () => {
      const { text } = await callTool(server, "what_changed_between_tax_years", {
        fromYear: 2024, toYear: 2025,
      });
      expect(text).toContain("What Changed");
      expect(text).toContain("Standard Deduction");
      expect(text).toContain("SALT");
      expect(text).toContain("One Big Beautiful Bill");
    });
  });

  // --- Comprehensive Tools ---
  describe("generate_full_tax_report", () => {
    it("generates full report", async () => {
      const { text } = await callTool(server, "generate_full_tax_report", {
        taxYear: 2024, filingStatus: "single", w2Income: 85000, stateCode: "CA",
      });
      expect(text).toContain("Full Tax Report");
      expect(text).toContain("Income Summary");
      expect(text).toContain("Federal Tax");
      expect(text).toContain("FICA");
      expect(text).toContain("California");
      expect(text).toContain("Take-Home");
    });

    it("describes preferential rates under AMT accurately", async () => {
      const { text } = await callTool(server, "generate_full_tax_report", {
        taxYear: 2024,
        filingStatus: "single",
        w2Income: 100000,
        longTermCapitalGains: 900000,
      });

      expect(text).toContain("| AMT | $12,159 |");
      expect(text).toContain(
        "AMT applies annual exemptions, phase-outs, 26%/28% ordinary rates, and preferential rates for qualified dividends and net capital gains.",
      );
      expect(text).not.toContain(
        "Does not apply preferential capital gains rates under AMT",
      );
    });
  });

  describe("generate_tax_plan", () => {
    it("applies TY2026 non-itemizer charitable and dependent care facts", async () => {
      // Taxable $40,000 - $24,150 - $1,000 = $14,850; care credit 37% x $3,000 = $1,110.
      const result = await callTool(server, "generate_tax_plan", {
        taxYear: 2026,
        filingStatus: "head_of_household",
        income: { w2: 40000 },
        deductions: { nonItemizerCashCharitable: 1500 },
        family: { dependentCareExpenses: 4000, dependentCareQualifyingIndividuals: 1 },
      });
      const plan = z.object({
        plan: z.object({
          results: z.object({
            taxableIncome: z.number(),
            ordinaryIncomeTax: z.number(),
            dependentCareCredit: z.number(),
          }),
        }),
      }).parse(result.structuredContent);
      expect(plan.plan.results.taxableIncome).toBe(14850);
      expect(plan.plan.results.dependentCareCredit).toBeCloseTo(1110, 2);
    });

    it("returns deterministic domain structured content without persistence", async () => {
      const result = await callTool(server, "generate_tax_plan", {
        taxYear: 2026,
        filingStatus: "single",
        income: {
          w2: 100000,
          taxableInterest: 500,
          ordinaryDividends: 1000,
          qualifiedDividends: 800,
        },
        payments: { federalWithholding: 14000 },
      });
      const structured = z.object({
        text: z.string(),
        isError: z.literal(false),
        plan: z.object({
          contractVersion: z.literal("1.0"),
          taxYear: z.literal(2026),
          privacy: z.object({
            execution: z.literal("local"),
            networkRequests: z.literal(false),
            persisted: z.literal(false),
            telemetry: z.literal(false),
            modelInvoked: z.literal(true),
          }),
          facts: z.object({ grossIncome: z.number() }),
          results: z.object({
            adjustedGrossIncome: z.number(),
            totalTax: z.number(),
            federalBalance: z.number(),
          }),
          sources: z.array(z.object({ title: z.string() })),
          calculationTrace: z.array(z.object({ step: z.string() })),
        }),
      }).parse(result.structuredContent);

      expect(result.text).toContain("Local Tax Plan for TY2026");
      expect(structured.plan.facts.grossIncome).toBe(101500);
      expect(structured.plan.results.totalTax).toBeGreaterThan(0);
      expect(structured.plan.sources[0]?.title)
        .toContain("Revenue Procedure 2025-32");
    });

    it("rejects qualified dividends above ordinary dividends", async () => {
      const result = await callTool(server, "generate_tax_plan", {
        taxYear: 2026,
        filingStatus: "single",
        income: {
          w2: 100000,
          ordinaryDividends: 1000,
          qualifiedDividends: 1500,
        },
      });
      const structured = z.object({
        isError: z.literal(true),
        error: z.object({ code: z.literal("INVALID_INPUT") }),
      }).parse(result.structuredContent);

      expect(result.isError).toBe(true);
      expect(structured.error.code).toBe("INVALID_INPUT");
    });

    it("fails closed for a state without an exact-year numeric profile", async () => {
      const result = await callTool(server, "generate_tax_plan", {
        taxYear: 2026,
        filingStatus: "single",
        income: { w2: 100000 },
        stateCode: "NY",
      });
      const structured = z.object({
        isError: z.literal(true),
        error: z.object({ code: z.literal("NOT_AVAILABLE") }),
      }).parse(result.structuredContent);

      expect(result.isError).toBe(true);
      expect(structured.error.code).toBe("NOT_AVAILABLE");
    });

    it("limits capital losses before deriving gross income", async () => {
      const result = await callTool(server, "generate_tax_plan", {
        taxYear: 2024,
        filingStatus: "single",
        income: { w2: 100000, longTermCapitalGain: -10000 },
      });
      const structured = z.object({
        plan: z.object({
          facts: z.object({ grossIncome: z.number() }),
          results: z.object({ adjustedGrossIncome: z.number() }),
        }),
      }).parse(result.structuredContent);

      expect(structured.plan.facts.grossIncome).toBe(97000);
      expect(structured.plan.results.adjustedGrossIncome).toBe(97000);
    });

    it("limits capital-loss carryovers without double counting", async () => {
      const result = await callTool(server, "generate_tax_plan", {
        taxYear: 2026,
        filingStatus: "single",
        income: { w2: 100000, longTermCapitalLossCarryover: 10000 },
      });
      const structured = z.object({
        plan: z.object({
          facts: z.object({
            grossIncome: z.number(),
            cashIncome: z.number(),
          }),
          results: z.object({ adjustedGrossIncome: z.number() }),
        }),
      }).parse(result.structuredContent);

      expect(structured.plan.facts.cashIncome).toBe(100000);
      expect(structured.plan.facts.grossIncome).toBe(97000);
      expect(structured.plan.results.adjustedGrossIncome).toBe(97000);
    });

    it("uses separate EITC children and tax-exempt investment income", async () => {
      const eligible = await callTool(server, "generate_tax_plan", {
        taxYear: 2026,
        filingStatus: "single",
        income: { w2: 18290 },
        family: { qualifyingChildrenForEitc: 3 },
      });
      const disqualified = await callTool(server, "generate_tax_plan", {
        taxYear: 2026,
        filingStatus: "single",
        income: { w2: 18290, taxExemptInterest: 20000 },
        family: { qualifyingChildrenForEitc: 3 },
      });
      const ResultSchema = z.object({
        plan: z.object({
          results: z.object({ refundableCredits: z.number() }),
        }),
      });

      expect(ResultSchema.parse(eligible.structuredContent)
        .plan.results.refundableCredits).toBe(8231);
      expect(ResultSchema.parse(disqualified.structuredContent)
        .plan.results.refundableCredits).toBe(0);
    });

    it.each([
      {
        name: "taxable retirement amount",
        input: {
          taxYear: 2026,
          filingStatus: "single",
          income: { w2: 50000, retirementDistributions: 10000 },
        },
      },
      {
        name: "QBI limitation facts",
        input: {
          taxYear: 2026,
          filingStatus: "single",
          income: { w2: 50000 },
          business: { qualifiedBusinessIncome: 10000 },
        },
      },
    ])("requires $name", async ({ input }) => {
      const result = await callTool(server, "generate_tax_plan", input);
      const structured = z.object({
        isError: z.literal(true),
        error: z.object({ code: z.literal("INVALID_INPUT") }),
      }).parse(result.structuredContent);

      expect(result.isError).toBe(true);
      expect(structured.error.code).toBe("INVALID_INPUT");
    });
  });

  describe("process_1099_income", () => {
    it("processes multiple 1099 forms", async () => {
      const { text } = await callTool(server, "process_1099_income", {
        taxYear: 2024, filingStatus: "single",
        forms: [
          { type: "1099-NEC", payer: "Client A", amount: 50000 },
          { type: "1099-INT", payer: "Bank", amount: 500 },
          { type: "1099-DIV", payer: "Vanguard", amount: 2000, qualifiedDividends: 1500 },
        ],
      });
      expect(text).toContain("1099 Income Summary");
      expect(text).toContain("Client A");
      expect(text).toContain("Self-Employment");
    });

    it("processes Form 1099-R taxable and early-distribution amounts", async () => {
      const { text } = await callTool(server, "process_1099_income", {
        taxYear: 2025,
        filingStatus: "single",
        w2Income: 50000,
        forms: [{
          type: "1099-R",
          payer: "Test Retirement Plan",
          amount: 30000,
          taxableAmount: 20000,
          earlyDistributionSubjectToPenalty: 10000,
        }],
      });

      expect(text).toContain("1099-R Taxable Distributions | $20,000");
      expect(text).toContain("Early Distribution Additional Tax | $1,000");
    });
  });

  describe("get_personalized_tax_calendar", () => {
    it("returns personalized calendar", async () => {
      const { text } = await callTool(server, "get_personalized_tax_calendar", {
        taxYear: 2024, isSelfEmployed: true, hasInvestments: true,
      });
      expect(text).toContain("Tax Calendar");
      expect(text).toContain("estimated tax");
      expect(text).toContain("1099");
    });
  });

  describe("analyze_paycheck", () => {
    it("analyzes paycheck withholding", async () => {
      const { text } = await callTool(server, "analyze_paycheck", {
        taxYear: 2024, filingStatus: "single", payFrequency: "biweekly",
        grossPay: 3500, federalWithheld: 450, socialSecurityWithheld: 217, medicareWithheld: 51,
      });
      expect(text).toContain("Paycheck Analysis");
      expect(text).toContain("Annual Projection");
    });
  });

  describe("compare_mfj_vs_mfs", () => {
    it("compares MFJ vs MFS", async () => {
      const { text } = await callTool(server, "compare_mfj_vs_mfs", {
        taxYear: 2024, spouse1Income: 80000, spouse2Income: 60000,
      });
      expect(text).toContain("MFJ vs MFS");
      expect(text).toContain("MFS Restrictions");
    });
  });

  describe("simulate_tax_scenario", () => {
    it("simulates income change", async () => {
      const { text } = await callTool(server, "simulate_tax_scenario", {
        taxYear: 2024, filingStatus: "single", currentIncome: 100000,
        whatIfIncomeChange: 20000,
      });
      expect(text).toContain("Scenario Simulator");
      expect(text).toContain("Current");
      expect(text).toContain("What-If");
    });

    it("simulates relocation", async () => {
      const { text } = await callTool(server, "simulate_tax_scenario", {
        taxYear: 2024, filingStatus: "single", currentIncome: 150000,
        currentState: "CA", whatIfNewState: "TX",
      });
      expect(text).toContain("Relocation Analysis");
      expect(text).toContain("saves");
    });

    it("simulates Roth conversion", async () => {
      const { text } = await callTool(server, "simulate_tax_scenario", {
        taxYear: 2024, filingStatus: "single", currentIncome: 80000,
        whatIfRothConversion: 30000,
      });
      expect(text).toContain("Roth Conversion Analysis");
      expect(text).toContain("Break-even");
    });
  });

  describe("assess_audit_risk", () => {
    it("assesses low risk profile", async () => {
      const { text } = await callTool(server, "assess_audit_risk", {
        filingStatus: "single", grossIncome: 75000,
      });
      expect(text).toContain("Audit Risk");
      expect(text).toContain("LOW");
    });

    it("identifies high risk factors", async () => {
      const { text } = await callTool(server, "assess_audit_risk", {
        filingStatus: "single", grossIncome: 1500000,
        selfEmploymentIncome: 500000, cashBusiness: true, foreignAccounts: true,
      });
      expect(text).toContain("HIGH");
      expect(text).toContain("Cash-Intensive");
      expect(text).toContain("Foreign");
    });
  });

  // --- Advanced Tools ---
  describe("get_tax_document_checklist", () => {
    it("generates checklist for W-2 employee", async () => {
      const { text } = await callTool(server, "get_tax_document_checklist", {
        hasW2: true, hasMortgage: true, hasChildren: true,
      });
      expect(text).toContain("Tax Document Checklist");
      expect(text).toContain("W-2");
      expect(text).toContain("1098");
    });
  });

  describe("optimize_capital_gains", () => {
    it("analyzes investment lots", async () => {
      const { text } = await callTool(server, "optimize_capital_gains", {
        taxYear: 2024, filingStatus: "single", ordinaryIncome: 50000,
        lots: [
          { name: "AAPL", shares: 100, costBasis: 10000, currentValue: 18000, holdingMonths: 14 },
          { name: "TSLA", shares: 50, costBasis: 15000, currentValue: 12000, holdingMonths: 8 },
        ],
      });
      expect(text).toContain("Capital Gains Optimizer");
      expect(text).toContain("AAPL");
      expect(text).toContain("TSLA");
    });
  });

  describe("plan_retirement_withdrawals", () => {
    it("plans withdrawal strategy", async () => {
      const { text } = await callTool(server, "plan_retirement_withdrawals", {
        taxYear: 2024, filingStatus: "single", age: 65,
        traditionalBalance: 500000, rothBalance: 200000, taxableBalance: 100000,
        annualSpending: 60000, socialSecurityIncome: 24000,
      });
      expect(text).toContain("Retirement Withdrawal");
      expect(text).toContain("Traditional");
      expect(text).toContain("Roth");
    });
  });

  describe("plan_multi_year_taxes", () => {
    it("projects multi-year taxes", async () => {
      const { text } = await callTool(server, "plan_multi_year_taxes", {
        filingStatus: "single", currentAge: 55,
        years: [
          { year: 2024, expectedIncome: 120000 },
          { year: 2025, expectedIncome: 125000, plannedRothConversion: 20000 },
        ],
      });
      expect(text).toContain("Multi-Year Tax Plan");
      expect(text).toContain("2024");
      expect(text).toContain("2025");
    });
  });

  describe("analyze_relocation_taxes", () => {
    it("analyzes relocation from CA to TX", async () => {
      const { text } = await callTool(server, "analyze_relocation_taxes", {
        taxYear: 2024, filingStatus: "single", grossIncome: 200000,
        fromState: "CA", toState: "TX",
      });
      expect(text).toContain("Relocation Tax Analysis");
      expect(text).toContain("California");
      expect(text).toContain("Texas");
      expect(text).toContain("saves");
    });

    it("fails closed when relocation projection reaches an unversioned year", async () => {
      const { text, isError } = await callTool(server, "analyze_relocation_taxes", {
        taxYear: 2024,
        filingStatus: "single",
        grossIncome: 200000,
        fromState: "CA",
        toState: "TX",
        yearsToProject: 2,
      });

      expect(isError).toBe(true);
      expect(text).toContain("California TY2025 calculation data are not available");
    });
  });

  describe("TY2026 contribution limits (Notice 2025-67, Rev. Proc. 2025-19)", () => {
    it("uses TY2026 401(k) and HSA limits in planning tips", async () => {
      const { text } = await callTool(server, "get_tax_planning_tips", {
        taxYear: 2026, filingStatus: "single", estimatedIncome: 100000,
        hasRetirementPlan: true, currentRetirementContributions: 10000,
        hasHSA: true, currentHSAContributions: 1000,
      });
      expect(text).toContain("limit: $24,500");
      expect(text).toContain("individual limit: $4,400");
    });

    it("uses TY2026 limits and the self-employed 20% SEP rate", async () => {
      const { text } = await callTool(server, "estimate_self_employment_tax", {
        taxYear: 2026, filingStatus: "single", grossRevenue: 120000, businessExpenses: 30000,
      });
      expect(text).toContain("| SEP IRA | $16,728");
      expect(text).toContain("| Solo 401(k) Employee | $24,500 |");
      expect(text).toContain("| Solo 401(k) Total | $72,000 |");
    });

    it("uses the TY2026 401(k) limit in the health check", async () => {
      const { text } = await callTool(server, "run_tax_health_check", {
        taxYear: 2026, filingStatus: "single", grossIncome: 80000,
        w2Income: 80000, retirement401k: 10000, federalWithheld: 15000,
      });
      expect(text).toContain("limit: $24,500");
    });

    it("lists TY2026 retirement account limits", async () => {
      const { text } = await callTool(server, "get_retirement_accounts", { accountType: "roth_ira" });
      expect(text).toContain("| TY2026 Limit | $7,500 |");
    });
  });

  // --- Smart Tools ---
  describe("run_tax_health_check", () => {
    it("runs health check with findings", async () => {
      const { text } = await callTool(server, "run_tax_health_check", {
        taxYear: 2024, filingStatus: "single", grossIncome: 80000,
        w2Income: 80000, retirement401k: 10000, federalWithheld: 15000,
      });
      expect(text).toContain("Tax Health Check");
      expect(text).toContain("401(k)");
    });
  });

  describe("lookup_tax_rule", () => {
    it("finds wash sale rule", async () => {
      const { text } = await callTool(server, "lookup_tax_rule", { topic: "wash sale" });
      expect(text).toContain("Wash Sale");
      expect(text).toContain("30 days");
    });

    it("finds ISO vs NSO", async () => {
      const { text } = await callTool(server, "lookup_tax_rule", { topic: "ISO vs NSO" });
      expect(text).toContain("Incentive Stock Options");
      expect(text).toContain("Non-Qualified");
    });

    it("handles unknown topic", async () => {
      const { text } = await callTool(server, "lookup_tax_rule", { topic: "xyzzy" });
      expect(text).toContain("Not Found");
      expect(text).toContain("Available topics");
    });
  });

  describe("get_form_filing_guide", () => {
    it("returns 1040 guide", async () => {
      const { text } = await callTool(server, "get_form_filing_guide", { formNumber: "1040" });
      expect(text).toContain("Form 1040");
      expect(text).toContain("Filing Status");
      expect(text).toContain("Common Mistakes");
    });

    it("returns Schedule C guide", async () => {
      const { text } = await callTool(server, "get_form_filing_guide", { formNumber: "Schedule C" });
      expect(text).toContain("Schedule C");
      expect(text).toContain("Business");
    });

    it("handles unknown form", async () => {
      const { text } = await callTool(server, "get_form_filing_guide", { formNumber: "Form 99999" });
      expect(text).toContain("Not Available");
    });
  });

  describe("submit_feedback", () => {
    it("uses the shared runtime version without sending data", async () => {
      const { text } = await callTool(server, "submit_feedback", {
        toolName: "generate_tax_plan",
        taxYear: 2026,
        description: "Synthetic planner feedback",
      });

      expect(text).toContain(SERVER_VERSION);
      expect(text).toContain("No data is sent automatically");
      expect(text).not.toContain("0.5.3");
    });
  });

  describe("high-level federal accuracy regressions", () => {
    it("taxes qualified dividends at long-term capital gains rates", async () => {
      const { text } = await callTool(server, "generate_full_tax_report", {
        taxYear: 2024,
        filingStatus: "single",
        w2Income: 100000,
        dividendIncome: 20000,
        qualifiedDividends: 20000,
      });

      expect(text).toContain("| Capital Gains Tax | $3,000 |");
      expect(text).toContain("| **Federal Tax After Refundable Credits** | **$16,841** |");
    });

    it("reports refundable EITC and ACTC when no withholding remains", async () => {
      const { text } = await callTool(server, "generate_full_tax_report", {
        taxYear: 2024,
        filingStatus: "single",
        w2Income: 16500,
        dependents: 1,
      });

      expect(text).toContain("| Additional Child Tax Credit | -$1,700 |");
      expect(text).toContain("| EITC | -$4,213 |");
      expect(text).toContain("| **Federal Tax After Refundable Credits** | **-$5,913** |");
      expect(text).toContain("| **Federal Refund** | **$5,913**");
    });

    it("uses the TY2025 Social Security wage base in paycheck analysis", async () => {
      const { text } = await callTool(server, "analyze_paycheck", {
        taxYear: 2025,
        filingStatus: "single",
        payFrequency: "monthly",
        grossPay: 14675,
        federalWithheld: 3000,
        socialSecurityWithheld: 910,
      });

      expect(text).toContain("| Social Security | $910 | ~$910 | +$0 |");
    });

    it("includes taxable interest and dividends in full-report NIIT", async () => {
      const { text } = await callTool(server, "generate_full_tax_report", {
        taxYear: 2024,
        filingStatus: "single",
        w2Income: 250000,
        interestIncome: 25000,
        dividendIncome: 25000,
      });

      expect(text).toContain("| NIIT (3.8%) | $1,900 |");
    });

    it("uses MAGI rather than gross income for the SALT phase-down", async () => {
      const { text } = await callTool(server, "generate_full_tax_report", {
        taxYear: 2025,
        filingStatus: "single",
        w2Income: 510000,
        aboveTheLineDeductions: 20000,
        stateLocalTaxesPaid: 40000,
      });

      expect(text).toContain("SALT (capped at $40,000) | $40,000");
    });

    it("uses AGI for the medical-expense deduction floor", async () => {
      const { text } = await callTool(server, "generate_full_tax_report", {
        taxYear: 2025,
        filingStatus: "single",
        w2Income: 100000,
        aboveTheLineDeductions: 20000,
        medicalExpenses: 10000,
      });

      expect(text).toContain("Medical (above 7.5% AGI) | $4,000");
    });
  });

  describe("MFJ and MFS accuracy regressions", () => {
    it("allocates dependents to the separate returns instead of dropping them", async () => {
      const { text } = await callTool(server, "compare_mfj_vs_mfs", {
        taxYear: 2024,
        spouse1Income: 80000,
        spouse2Income: 60000,
        dependents: 1,
      });

      expect(text).toContain("| Combined Tax | **$12,482** | **$12,657** |");
      expect(text).toContain("| Dependents Allocation | 1 joint | 1 + 0 |");
    });

    it("requires both MFS spouses to itemize when combined itemized deductions are provided", async () => {
      const { text } = await callTool(server, "compare_mfj_vs_mfs", {
        taxYear: 2024,
        spouse1Income: 80000,
        spouse2Income: 60000,
        itemizedDeductions: 20000,
      });

      expect(text).toContain("| MFS Deductions | - | $10,000 + $10,000 |");
      expect(text).toContain("| Combined Tax | **$14,482** | **$16,506** |");
    });

    it("rejects dependent counts that would make allocation search unbounded", async () => {
      const { text, isError } = await callTool(server, "compare_mfj_vs_mfs", {
        taxYear: 2024,
        spouse1Income: 80000,
        spouse2Income: 60000,
        dependents: 21,
      });

      expect(isError).toBe(true);
      expect(text).toContain("Dependents cannot exceed 20");
    });
  });

  describe("OBBB phase-out accuracy regressions", () => {
    it("partially phases out tips and overtime at 10 percent of excess MAGI", async () => {
      const { text } = await callTool(server, "calculate_obbb_deductions", {
        taxYear: 2025,
        filingStatus: "single",
        agi: 151000,
        tipIncome: 25000,
        overtimePay: 12500,
      });

      expect(text).toContain("| Tips Income Deduction | $24,900 | $25,000 |");
      expect(text).toContain("| Overtime Pay Deduction | $12,400 | $12,500 |");
      expect(text).toContain("| **Total OBBB Deductions** | **$37,300** |");
    });

    it("phases out auto loan interest by $200 per $1,000 or portion", async () => {
      const { text } = await callTool(server, "calculate_obbb_deductions", {
        taxYear: 2025,
        filingStatus: "single",
        agi: 100001,
        autoLoanInterest: 10000,
      });

      expect(text).toContain("| Auto Loan Interest Deduction | $9,800 | $10,000 |");
    });

    it("reduces each senior deduction by 6 percent of excess MAGI", async () => {
      const { text: singleText } = await callTool(server, "calculate_obbb_deductions", {
        taxYear: 2025,
        filingStatus: "single",
        agi: 76000,
        age: 65,
      });
      const { text: jointText } = await callTool(server, "calculate_obbb_deductions", {
        taxYear: 2025,
        filingStatus: "married_filing_jointly",
        agi: 175000,
        age: 65,
        spouseAge: 65,
      });

      expect(singleText).toContain("| Senior Bonus Deduction (65+) | $5,940 | $6,000 |");
      expect(jointText).toContain("| Senior Bonus Deduction (65+) | $9,000 | $12,000 |");
    });

    it("does not allow tips, overtime, or senior deductions for MFS", async () => {
      const { text } = await callTool(server, "calculate_obbb_deductions", {
        taxYear: 2025,
        filingStatus: "married_filing_separately",
        agi: 50000,
        age: 65,
        tipIncome: 10000,
        overtimePay: 5000,
      });

      expect(text).toContain("| **Total OBBB Deductions** | **$0** |");
      expect(text).toContain("Married taxpayers must file jointly");
    });
  });

  describe("state tax fail-closed regressions", () => {
    it("returns an error instead of applying Arkansas top rate to all income", async () => {
      const { text, isError } = await callTool(server, "estimate_state_tax", {
        stateCode: "AR",
        taxYear: 2024,
        taxableIncome: 100000,
        filingStatus: "single",
      });

      expect(isError).toBe(true);
      expect(text).toContain("Arkansas TY2024 calculation data are not available");
    });

    it("uses California married brackets in the state estimate", async () => {
      const { text } = await callTool(server, "estimate_state_tax", {
        stateCode: "CA",
        taxYear: 2024,
        incomeBeforeStateDeductions: 100000,
        filingStatus: "married",
      });

      expect(text).toContain("| **Estimated State Tax** | **$2,490** |");
    });

    it("keeps taxableIncome as a deprecated compatibility alias", async () => {
      const { text } = await callTool(server, "estimate_state_tax", {
        stateCode: "CA",
        taxYear: 2024,
        taxableIncome: 100000,
        filingStatus: "single",
      });

      expect(text).toContain("taxableIncome is deprecated");
      expect(text).toContain("| **Estimated State Tax** | **$5,327** |");
    });

    it("rejects conflicting state income fields", async () => {
      const { text, isError } = await callTool(server, "estimate_state_tax", {
        stateCode: "CA",
        taxYear: 2024,
        incomeBeforeStateDeductions: 100000,
        taxableIncome: 90000,
      });

      expect(isError).toBe(true);
      expect(text).toContain("Provide exactly one of incomeBeforeStateDeductions or taxableIncome");
    });

    it("fails closed when the requested state year is not versioned", async () => {
      const { text, isError } = await callTool(server, "estimate_state_tax", {
        stateCode: "CA",
        taxYear: 2025,
        incomeBeforeStateDeductions: 100000,
      });

      expect(isError).toBe(true);
      expect(text).toContain("California TY2025 calculation data are not available");
    });

    it("fails the comparison when any requested state lacks supported brackets", async () => {
      const { text, isError } = await callTool(server, "compare_state_taxes", {
        states: ["AR", "TX"],
        taxYear: 2024,
        taxableIncome: 100000,
      });

      expect(isError).toBe(true);
      expect(text).toContain("Arkansas TY2024 calculation data are not available");
    });

    it.each([
      ["calculate_total_tax", {
        taxYear: 2024,
        filingStatus: "married_filing_jointly",
        grossIncome: 100000,
        stateCode: "NY",
      }],
      ["generate_full_tax_report", {
        taxYear: 2024,
        filingStatus: "married_filing_jointly",
        w2Income: 100000,
        stateCode: "NY",
      }],
      ["simulate_tax_scenario", {
        taxYear: 2024,
        filingStatus: "married_filing_jointly",
        currentIncome: 100000,
        currentState: "NY",
      }],
      ["plan_multi_year_taxes", {
        filingStatus: "married_filing_jointly",
        currentAge: 40,
        years: [{ year: 2024, expectedIncome: 100000, stateCode: "NY" }],
      }],
      ["analyze_relocation_taxes", {
        taxYear: 2024,
        filingStatus: "married_filing_jointly",
        grossIncome: 100000,
        fromState: "TX",
        toState: "NY",
      }],
    ] as const)("returns an MCP error from %s when the state-year profile is unavailable", async (toolName, args) => {
      const { text, isError } = await callTool(server, toolName, args);

      expect(isError).toBe(true);
      expect(text).toContain("New York TY2024 calculation data are not available");
    });
  });
});
