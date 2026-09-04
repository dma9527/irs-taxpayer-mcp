/**
 * Shared utilities for MCP tool implementations.
 */

import { z } from "zod";
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

/** Format a number as US currency string (no $ prefix). */
export function fmt(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

/** Zod enum for filing status, reused across all tool files. */
export const FilingStatusEnum = z.enum([
  "single",
  "married_filing_jointly",
  "married_filing_separately",
  "head_of_household",
]);

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
    },
  };
}

type TaxToolExtra = RequestHandlerExtra<ServerRequest, ServerNotification>;
type TaxToolHandler<InputShape extends ZodRawShapeCompat> = (
  params: ShapeOutput<InputShape>,
  extra: TaxToolExtra,
) => CallToolResult | Promise<CallToolResult>;

export function registerTaxTool<InputShape extends ZodRawShapeCompat>(
  server: McpServer,
  name: string,
  description: string,
  inputSchema: InputShape,
  handler: TaxToolHandler<InputShape>,
): void;
export function registerTaxTool(
  server: McpServer,
  name: string,
  description: string,
  inputSchema: ZodRawShapeCompat,
  handler: TaxToolHandler<ZodRawShapeCompat>,
): void {
  const normalizedHandler: TaxToolHandler<ZodRawShapeCompat> = async (
    params,
    extra,
  ) => normalizeToolResult(await handler(params, extra));

  server.registerTool<typeof TAX_TOOL_OUTPUT_SCHEMA, ZodRawShapeCompat>(
    name,
    {
      description,
      inputSchema,
      outputSchema: TAX_TOOL_OUTPUT_SCHEMA,
      annotations: READ_ONLY_TOOL_ANNOTATIONS,
    },
    normalizedHandler,
  );
}
