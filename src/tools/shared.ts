/**
 * Shared utilities for MCP tool implementations.
 */

import { z } from "zod";
import { FilingStatusSchema } from "../facts/taxpayer-facts.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type {
  ShapeOutput,
  ZodRawShapeCompat,
} from "@modelcontextprotocol/sdk/server/zod-compat.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
  CallToolResult,
  ServerNotification,
  ServerRequest,
} from "@modelcontextprotocol/sdk/types.js";

export const AMT_PLANNING_NOTE =
  "AMT applies annual exemptions, phase-outs, 26%/28% ordinary rates, and preferential rates for qualified dividends and net capital gains. Other Form 6251 preference items remain outside the modeled inputs.";

/** Format a number as US currency string (no $ prefix). */
export function fmt(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

/** Zod enum for filing status, reused across all tool files. */
export const FilingStatusEnum = FilingStatusSchema;

const TAX_TOOL_OUTPUT_SCHEMA = {
  text: z.string(),
  isError: z.boolean(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    suggestion: z.string(),
  }).optional(),
};

const READ_ONLY_TOOL_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

interface StructuredToolError {
  code: string;
  message: string;
  suggestion: string;
}

function extractText(result: CallToolResult): string {
  return result.content
    .map((item) => item.type === "text" ? item.text : "")
    .filter((text) => text.length > 0)
    .join("\n");
}

function extractStructuredError(result: CallToolResult): StructuredToolError | undefined {
  const error = result.structuredContent?.error;
  if (typeof error !== "object" || error === null) return undefined;
  if (!("code" in error) || !("message" in error) || !("suggestion" in error)) {
    return undefined;
  }
  if (typeof error.code !== "string"
    || typeof error.message !== "string"
    || typeof error.suggestion !== "string") {
    return undefined;
  }
  return {
    code: error.code,
    message: error.message,
    suggestion: error.suggestion,
  };
}

function normalizeToolResult(result: CallToolResult): CallToolResult {
  const text = extractText(result);
  const data = result.isError === true ? undefined : result.structuredContent?.data;
  const extractedError = extractStructuredError(result);
  const error = extractedError ?? (result.isError === true
    ? {
        code: "CALCULATION_ERROR",
        message: text,
        suggestion: "Check the supplied inputs and tool availability requirements.",
      }
    : undefined);
  return {
    ...result,
    structuredContent: {
      text,
      isError: result.isError === true,
      ...(error ? { error } : {}),
      ...(data !== undefined ? { data } : {}),
    },
  };
}

type TaxToolExtra = RequestHandlerExtra<ServerRequest, ServerNotification>;
type TaxToolHandler<InputShape extends ZodRawShapeCompat> = (
  params: ShapeOutput<InputShape>,
  extra: TaxToolExtra,
) => CallToolResult | Promise<CallToolResult>;

export interface TaxToolOptions {
  /** Typed calculation results returned in structuredContent.data on success. */
  dataSchema?: z.ZodType;
}

export function registerTaxTool<InputShape extends ZodRawShapeCompat>(
  server: McpServer,
  name: string,
  description: string,
  inputSchema: InputShape,
  handler: TaxToolHandler<InputShape>,
  options?: TaxToolOptions,
): void;
export function registerTaxTool(
  server: McpServer,
  name: string,
  description: string,
  inputSchema: ZodRawShapeCompat,
  handler: TaxToolHandler<ZodRawShapeCompat>,
  options: TaxToolOptions = {},
): void {
  const normalizedHandler: TaxToolHandler<ZodRawShapeCompat> = async (
    params,
    extra,
  ) => normalizeToolResult(await handler(params, extra));
  const outputSchema = options.dataSchema
    ? { ...TAX_TOOL_OUTPUT_SCHEMA, data: options.dataSchema.optional() }
    : TAX_TOOL_OUTPUT_SCHEMA;

  server.registerTool<typeof outputSchema, ZodRawShapeCompat>(
    name,
    {
      description,
      inputSchema,
      outputSchema,
      annotations: READ_ONLY_TOOL_ANNOTATIONS,
    },
    normalizedHandler,
  );
}

/** Federal engine fields shared by structured tool outputs. */
export const FederalTaxDataSchema = z.object({
  taxYear: z.number(),
  filingStatus: z.string(),
  adjustedGrossIncome: z.number(),
  deductionType: z.enum(["standard", "itemized"]),
  deductionAmount: z.number(),
  taxableIncome: z.number(),
  ordinaryIncomeTax: z.number(),
  capitalGainsTax: z.number(),
  selfEmploymentTax: z.number(),
  niit: z.number(),
  additionalMedicareTax: z.number(),
  qbiDeduction: z.number(),
  amt: z.number(),
  childTaxCredit: z.number(),
  creditForOtherDependents: z.number(),
  dependentCareCredit: z.number(),
  additionalChildTaxCredit: z.number(),
  totalFederalTax: z.number(),
  effectiveRate: z.number(),
  marginalRate: z.number(),
  limitations: z.array(z.string()),
});
export type FederalTaxData = z.infer<typeof FederalTaxDataSchema>;

/** State calculation fields shared by structured tool outputs. */
export const StateTaxDataSchema = z.object({
  stateCode: z.string(),
  taxYear: z.number(),
  tax: z.number(),
  deduction: z.number(),
  excludedIncome: z.number(),
  adjustedIncome: z.number(),
  effectiveRate: z.number(),
  hasLocalTaxes: z.boolean(),
});
export type StateTaxData = z.infer<typeof StateTaxDataSchema>;

export function toFederalTaxData(result: FederalTaxData): FederalTaxData {
  return FederalTaxDataSchema.parse(result);
}

export function toStateTaxData(
  result: Omit<StateTaxData, "taxYear">,
  taxYear: number,
): StateTaxData {
  return StateTaxDataSchema.parse({ ...result, taxYear });
}
