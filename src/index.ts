#!/usr/bin/env node
/**
 * IRS Taxpayer MCP Server
 *
 * A Model Context Protocol server for individual US taxpayers.
 * Local architecture:
 *   - All tax calculations run locally (no PII leaves the machine)
 *   - Public IRS reference data is bundled and versioned locally
 *   - No runtime network calls, persistence, or telemetry
 *
 * Supports stdio and Streamable HTTP transports:
 *   stdio (default): npx irs-taxpayer-mcp
 *   HTTP:            npx irs-taxpayer-mcp --http [--port 3000]
 *
 * @see https://modelcontextprotocol.io
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  parseCliOptions,
  startHttpServer,
  type CliOptions,
} from "./http-server.js";
import {
  createTaxServer,
  SERVER_VERSION,
  TOOL_COUNT,
} from "./tax-server.js";

const args = process.argv.slice(2);

async function startStdio(): Promise<void> {
  const server = createTaxServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`IRS Taxpayer MCP server running on stdio; ${TOOL_COUNT} tools loaded`);
}

async function main(options: CliOptions): Promise<void> {
  if (options.transport === "stdio") {
    await startStdio();
    return;
  }

  await startHttpServer(options);
  const hostForUrl = options.host === "::1" ? "[::1]" : options.host;
  console.error(
    `IRS Taxpayer MCP server running on Streamable HTTP at http://${hostForUrl}:${options.port}/mcp; ${TOOL_COUNT} tools loaded`,
  );
  if (args.includes("--sse")) {
    console.error("Warning: --sse is deprecated and now starts Streamable HTTP. Use --http.");
  }
}

if (args.includes("--help") || args.includes("-h")) {
  printHelp();
} else {
  try {
    await main(parseCliOptions(args));
  } catch (error: unknown) {
    console.error("Failed to start server:", error);
    process.exitCode = 1;
  }
}

function printHelp(): void {
  const help = `
irs-taxpayer-mcp v${SERVER_VERSION}: Tax assistant MCP server for US individual taxpayers

USAGE:
  npx irs-taxpayer-mcp                         Start in stdio mode (default)
  npx irs-taxpayer-mcp --http                  Start Streamable HTTP on 127.0.0.1:3000
  npx irs-taxpayer-mcp --http --port 8080      Use a different loopback port
  npx irs-taxpayer-mcp --http --host localhost Bind another loopback hostname
  npx irs-taxpayer-mcp --http --allowed-origin https://trusted.example
  npx irs-taxpayer-mcp --help                  Show this help

  --sse is a deprecated alias for --http. Legacy GET /sse is not exposed.
  HTTP transport only binds to loopback hosts. Browser Origins must exactly match
  a local server Origin or a repeated --allowed-origin value.

TOOLS (${TOOL_COUNT}):

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
    generate_tax_plan           Local structured plan with sources and trace
    generate_full_tax_report     Detailed estimation report
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

  Guidance & Feedback
    run_tax_health_check         Check tool coverage and tax-data freshness
    lookup_tax_rule              Search the built-in tax knowledge base
    get_form_filing_guide        Step-by-step IRS form filing guidance
    submit_feedback              Generate a GitHub issue link for feedback

PRIVACY: All calculations run locally. No data leaves your machine.
DATA: TY2024 through TY2026 from annual IRS and SSA sources.
`;
  console.log(help);
}
