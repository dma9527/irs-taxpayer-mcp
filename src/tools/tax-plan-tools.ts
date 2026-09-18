import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ShapeOutput } from "@modelcontextprotocol/sdk/server/zod-compat.js";
import {
  TAXPAYER_FACTS_SHAPE,
  TaxpayerFactsSchema,
} from "../facts/taxpayer-facts.js";
import {
  buildTaxPlan,
  TaxPlanSchema,
  TaxPlanServiceError,
} from "../services/tax-plan-service.js";
import { toolError, wrapToolHandler } from "./error-handler.js";

const TAX_PLAN_OUTPUT_SCHEMA = {
  text: z.string(),
  isError: z.boolean(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    suggestion: z.string(),
  }).optional(),
  plan: TaxPlanSchema.optional(),
};

type TaxPlanInput = ShapeOutput<typeof TAXPAYER_FACTS_SHAPE>;

export function registerTaxPlanTools(server: McpServer): void {
  const handler = wrapToolHandler<TaxPlanInput>(async (params) => {
    try {
      const facts = TaxpayerFactsSchema.parse(params);
      const result = buildTaxPlan(facts, { modelInvoked: true });
      return {
        content: [{ type: "text", text: result.text }],
        structuredContent: {
          text: result.text,
          isError: false,
          plan: result.plan,
        },
      };
    } catch (error) {
      if (error instanceof TaxPlanServiceError) {
        return toolError({
          code: error.code,
          message: error.message,
          suggestion: error.suggestion,
        });
      }
      throw error;
    }
  });

  server.registerTool<typeof TAX_PLAN_OUTPUT_SCHEMA, typeof TAXPAYER_FACTS_SHAPE>(
    "generate_tax_plan",
    {
      description:
        "Generate a deterministic, privacy-first local tax plan with structured results, assumptions, source provenance, calculation trace, and explicit unsupported boundaries.",
      inputSchema: TAXPAYER_FACTS_SHAPE,
      outputSchema: TAX_PLAN_OUTPUT_SCHEMA,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    handler,
  );
}
