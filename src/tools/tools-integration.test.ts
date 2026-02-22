/**
 * Integration tests for all MCP tools.
 * Tests the tool registration and execution through the MCP server.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTaxCalculationTools } from "./tax-calculation-tools.js";
import { registerDeductionTools } from "./deduction-tools.js";
import { registerIrsLookupTools } from "./irs-lookup-tools.js";
import { registerCreditTools } from "./credit-tools.js";
import { registerStateTaxTools } from "./state-tax-tools.js";
import { registerPlanningTools } from "./planning-tools.js";
import { registerObbbTools } from "./obbb-tools.js";
import { registerComprehensiveTools } from "./comprehensive-tools.js";

// Helper to call a tool on the server
async function callTool(
  server: McpServer,
  name: string,
  args: Record<string, unknown>
): Promise<{ text: string; isError?: boolean }> {
  const serverInternal = server as unknown as {
    _registeredTools: Record<string, { handler: (args: Record<string, unknown>, extra: unknown) => Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> }>;
  };
  const tool = serverInternal._registeredTools[name];
  if (!tool) throw new Error(`Tool "${name}" not found`);
  const result = await tool.handler(args, {});
  const text = result.content.map((c) => c.text).join("\n");
  return { text, isError: result.isError };
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
  });

  // --- IRS Lookup Tools ---
  describe("get_tax_deadlines", () => {
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
        stateCode: "CA", taxableIncome: 100000,
      });
      expect(text).toContain("California");
      expect(text).toContain("Estimated State Tax");
    });

    it("shows zero for no-tax state", async () => {
      const { text } = await callTool(server, "estimate_state_tax", {
        stateCode: "TX", taxableIncome: 100000,
      });
      expect(text).toContain("No State Income Tax");
    });
  });

  describe("compare_state_taxes", () => {
    it("compares multiple states", async () => {
      const { text } = await callTool(server, "compare_state_taxes", {
        states: ["CA", "TX", "NY"], taxableIncome: 150000,
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

    it("shows not available for TY2024", async () => {
      const { text } = await callTool(server, "calculate_obbb_deductions", {
        taxYear: 2024, filingStatus: "single", agi: 50000,
      });
      expect(text).toContain("Not Available");
    });
  });

  describe("what_changed_between_tax_years", () => {
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
});
