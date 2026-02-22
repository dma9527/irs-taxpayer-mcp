#!/usr/bin/env node

/**
 * IRS Taxpayer MCP Server
 *
 * A Model Context Protocol server for individual US taxpayers.
 * Hybrid architecture:
 *   - All tax calculations run locally (no PII leaves the machine)
 *   - Only public IRS data is fetched remotely when needed
 *
 * Supports both stdio and SSE transports:
 *   stdio (default): npx irs-taxpayer-mcp
 *   SSE:             npx irs-taxpayer-mcp --sse [--port 3000]
 *
 * @see https://modelcontextprotocol.io
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { registerTaxCalculationTools } from "./tools/tax-calculation-tools.js";
import { registerDeductionTools } from "./tools/deduction-tools.js";
import { registerIrsLookupTools } from "./tools/irs-lookup-tools.js";
import { registerCreditTools } from "./tools/credit-tools.js";
import { registerStateTaxTools } from "./tools/state-tax-tools.js";
import { registerPlanningTools } from "./tools/planning-tools.js";
import { registerObbbTools } from "./tools/obbb-tools.js";
import { registerComprehensiveTools } from "./tools/comprehensive-tools.js";
import { registerAdvancedTools } from "./tools/advanced-tools.js";
import http from "node:http";

const server = new McpServer({
  name: "irs-taxpayer-mcp",
  version: "0.5.1",
  description:
    "Tax calculation, credits, deductions, state taxes, and retirement strategy tools for individual US taxpayers. " +
    "All financial calculations run locally — your income data never leaves your machine.",
});

// Register all tool groups
registerTaxCalculationTools(server);   // 6 tools: calculate, brackets, compare, quarterly, total, w4
registerDeductionTools(server);        // 2 tools: list deductions, standard vs itemized
registerIrsLookupTools(server);        // 3 tools: deadlines, refund status, form info
registerCreditTools(server);           // 5 tools: list credits, eligibility, retirement accounts, strategies, EITC
registerStateTaxTools(server);         // 4 tools: state info, estimate, compare states, no-tax states
registerPlanningTools(server);         // 6 tools: planning tips, year compare, SE tax, mortgage, education, MFJ vs MFS
registerObbbTools(server);             // 2 tools: OBBB deductions calculator, what changed between years
registerComprehensiveTools(server);    // 6 tools: report, 1099, calendar, paycheck, scenario, audit
registerAdvancedTools(server);         // 5 tools: docs, capgains, retirement, multi-year, relocation

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  printHelp();
  process.exit(0);
}

const useSSE = args.includes("--sse");
const portIndex = args.indexOf("--port");
const port = portIndex !== -1 ? parseInt(args[portIndex + 1], 10) : 3000;

async function main(): Promise<void> {
  if (useSSE) {
    await startSSE(port);
  } else {
    await startStdio();
  }
}

async function startStdio(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("IRS Taxpayer MCP server running on stdio — 39 tools loaded");
}

async function startSSE(ssePort: number): Promise<void> {
  let sseTransport: SSEServerTransport | null = null;

  const httpServer = http.createServer(async (req, res) => {
    // CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.url === "/sse" && req.method === "GET") {
      sseTransport = new SSEServerTransport("/messages", res);
      await server.connect(sseTransport);
      return;
    }

    if (req.url === "/messages" && req.method === "POST") {
      if (sseTransport) {
        await sseTransport.handlePostMessage(req, res);
      } else {
        res.writeHead(400);
        res.end("No SSE connection established. Connect to /sse first.");
      }
      return;
    }

    // Health check
    if (req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", tools: 39, transport: "sse" }));
      return;
    }

    res.writeHead(404);
    res.end("Not found. Use GET /sse for SSE connection, POST /messages for messages, GET /health for status.");
  });

  httpServer.listen(ssePort, () => {
    console.error(`IRS Taxpayer MCP server running on SSE — http://localhost:${ssePort}/sse — 25 tools loaded`);
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});

function printHelp(): void {
  const help = `
irs-taxpayer-mcp v0.5.1 — Tax assistant MCP server for US individual taxpayers

USAGE:
  npx irs-taxpayer-mcp              Start in stdio mode (default)
  npx irs-taxpayer-mcp --sse        Start in SSE mode (port 3000)
  npx irs-taxpayer-mcp --sse --port 8080
  npx irs-taxpayer-mcp --help       Show this help

TOOLS (39):

  Federal Tax Calculations
    calculate_federal_tax        Full federal tax with AMT, NIIT, QBI, SE tax, CTC
    get_tax_brackets             Tax brackets by filing status and year
    compare_filing_statuses      Compare all 4 filing statuses
    estimate_quarterly_tax       Estimated quarterly payments (1040-ES)
    calculate_total_tax          Combined federal + state + take-home
    calculate_w4_withholding     W-4 form recommendations

  Deductions
    list_deductions              Browse all deductions with rules
    standard_vs_itemized         Compare standard vs itemized

  Credits
    list_tax_credits             20+ federal credits
    check_credit_eligibility     Quick eligibility screening
    calculate_eitc               Precise EITC calculation

  Retirement
    get_retirement_accounts      IRA, Roth, 401k, HSA, 529 details
    get_retirement_strategy      Backdoor Roth, tax-loss harvesting

  Tax Planning
    get_tax_planning_tips        Year-end optimization strategies
    compare_tax_years            TY2024 vs TY2025 differences
    estimate_self_employment_tax Full SE tax breakdown
    analyze_mortgage_tax_benefit Mortgage deduction analysis
    analyze_education_tax_benefits AOTC vs LLC comparison
    compare_mfj_vs_mfs          MFJ vs MFS with restrictions

  State Taxes
    get_state_tax_info           Rates for all 50 states + DC
    estimate_state_tax           State tax estimate
    compare_state_taxes          Multi-state comparison
    list_no_income_tax_states    9 no-tax states

  IRS Info
    get_tax_deadlines            Key IRS dates
    check_refund_status          Refund check guidance
    get_irs_form_info            Common IRS form info

  OBBB Act (2025)
    calculate_obbb_deductions    Tips, overtime, senior, auto loan
    what_changed_between_tax_years Year-over-year diff

  Reports & Analysis
    generate_full_tax_report     Full TurboTax-style report
    process_1099_income          Process multiple 1099 forms
    get_personalized_tax_calendar Personalized deadlines
    analyze_paycheck             Verify paycheck withholding
    simulate_tax_scenario        What-if modeling
    assess_audit_risk            Audit risk scoring

  Advanced
    get_tax_document_checklist   Filing document checklist
    optimize_capital_gains       Investment lot tax optimization
    plan_retirement_withdrawals  Withdrawal order strategy
    plan_multi_year_taxes        3-5 year tax projection
    analyze_relocation_taxes     State relocation analysis

PRIVACY: All calculations run locally. No data leaves your machine.
DATA: TY2024 (Rev. Proc. 2023-34) and TY2025 (OBBB Act).
`;
  console.log(help);
}
