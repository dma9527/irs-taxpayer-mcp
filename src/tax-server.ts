import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAdvancedTools } from "./tools/advanced-tools.js";
import { registerComprehensiveTools } from "./tools/comprehensive-tools.js";
import { registerCreditTools } from "./tools/credit-tools.js";
import { registerDeductionTools } from "./tools/deduction-tools.js";
import { registerIrsLookupTools } from "./tools/irs-lookup-tools.js";
import { registerObbbTools } from "./tools/obbb-tools.js";
import { registerPlanningTools } from "./tools/planning-tools.js";
import { registerSmartTools } from "./tools/smart-tools.js";
import { registerStateTaxTools } from "./tools/state-tax-tools.js";
import { registerTaxCalculationTools } from "./tools/tax-calculation-tools.js";

import { registerTaxPlanTools } from "./tools/tax-plan-tools.js";
import { SERVER_VERSION } from "./version.js";
export { SERVER_VERSION } from "./version.js";
export const SERVER_NAME = "irs-taxpayer-mcp";
export const TOOL_COUNT = 44;

export function createTaxServer(): McpServer {
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
    description:
      "Privacy-first local tax calculation and planning tools for individual US taxpayers. " +
      "All financial calculations are deterministic and run locally; your income data never leaves your machine.",
  });

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

  return server;
}
