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
import http from "node:http";

const server = new McpServer({
  name: "irs-taxpayer-mcp",
  version: "0.3.0",
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
registerComprehensiveTools(server);    // 6 tools: full report, 1099, calendar, paycheck, scenario, audit risk

const args = process.argv.slice(2);
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
  console.error("IRS Taxpayer MCP server running on stdio — 34 tools loaded");
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
      res.end(JSON.stringify({ status: "ok", tools: 25, transport: "sse" }));
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
