#!/usr/bin/env node

/**
 * IRS Taxpayer MCP Server
 *
 * A Model Context Protocol server for individual US taxpayers.
 * Hybrid architecture:
 *   - All tax calculations run locally (no PII leaves the machine)
 *   - Only public IRS data is fetched remotely when needed
 *
 * @see https://modelcontextprotocol.io
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerTaxCalculationTools } from "./tools/tax-calculation-tools.js";
import { registerDeductionTools } from "./tools/deduction-tools.js";
import { registerIrsLookupTools } from "./tools/irs-lookup-tools.js";
import { registerCreditTools } from "./tools/credit-tools.js";
import { registerStateTaxTools } from "./tools/state-tax-tools.js";

const server = new McpServer({
  name: "irs-taxpayer-mcp",
  version: "0.2.0",
  description:
    "Tax calculation, credits, deductions, state taxes, and retirement strategy tools for individual US taxpayers. " +
    "All financial calculations run locally — your income data never leaves your machine.",
});

// Register all tool groups
registerTaxCalculationTools(server);   // 4 tools: calculate, brackets, compare statuses, quarterly
registerDeductionTools(server);        // 2 tools: list deductions, standard vs itemized
registerIrsLookupTools(server);        // 3 tools: deadlines, refund status, form info
registerCreditTools(server);           // 4 tools: list credits, eligibility check, retirement accounts, strategies
registerStateTaxTools(server);         // 4 tools: state info, estimate, compare states, no-tax states

// Start the server
async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("IRS Taxpayer MCP server running on stdio — 17 tools loaded");
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
