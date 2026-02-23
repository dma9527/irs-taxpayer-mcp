/**
 * Unified error handling for all MCP tools.
 * Provides consistent error format with actionable suggestions.
 */

export type ErrorCode =
  | "UNSUPPORTED_TAX_YEAR"
  | "INVALID_STATE"
  | "INVALID_INPUT"
  | "ZERO_INCOME"
  | "NOT_FOUND"
  | "NOT_AVAILABLE"
  | "CALCULATION_ERROR"
  | "INTERNAL_ERROR";

interface ToolError {
  code: ErrorCode;
  message: string;
  suggestion: string;
}

const ERROR_TEMPLATES: Record<ErrorCode, { emoji: string; title: string }> = {
  UNSUPPORTED_TAX_YEAR: { emoji: "📅", title: "Unsupported Tax Year" },
  INVALID_STATE: { emoji: "🗺️", title: "Invalid State Code" },
  INVALID_INPUT: { emoji: "⚠️", title: "Invalid Input" },
  ZERO_INCOME: { emoji: "💰", title: "Income Required" },
  NOT_FOUND: { emoji: "🔍", title: "Not Found" },
  NOT_AVAILABLE: { emoji: "🚫", title: "Not Available" },
  CALCULATION_ERROR: { emoji: "🧮", title: "Calculation Error" },
  INTERNAL_ERROR: { emoji: "❌", title: "Internal Error" },
};

/**
 * Format a structured error response for MCP tools.
 */
export function toolError(error: ToolError): { content: Array<{ type: "text"; text: string }>; isError: true } {
  const template = ERROR_TEMPLATES[error.code];
  const lines = [
    `${template.emoji} **${template.title}**`,
    "",
    error.message,
    "",
    `💡 **What to do**: ${error.suggestion}`,
  ];
  return {
    content: [{ type: "text" as const, text: lines.join("\n") }],
    isError: true,
  };
}

/**
 * Wrap a tool handler with try/catch that produces friendly error messages.
 */
export function wrapToolHandler<T>(
  handler: (params: T) => Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }>
): (params: T) => Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  return async (params: T) => {
    try {
      return await handler(params);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      // Detect common error patterns and give specific suggestions
      if (message.includes("not supported")) {
        return toolError({
          code: "UNSUPPORTED_TAX_YEAR",
          message,
          suggestion: "Use taxYear 2024 or 2025. These are the currently supported tax years.",
        });
      }

      if (message.includes("Validation")) {
        return toolError({
          code: "INVALID_INPUT",
          message,
          suggestion: "Check your input values. Income should be positive, tax year should be 2024 or 2025.",
        });
      }

      return toolError({
        code: "CALCULATION_ERROR",
        message: `An error occurred: ${message}`,
        suggestion: "Check your inputs and try again. If the problem persists, please report it at https://github.com/dma9527/irs-taxpayer-mcp/issues",
      });
    }
  };
}

// Pre-built common errors
export const ERRORS = {
  unsupportedYear: (year: number) => toolError({
    code: "UNSUPPORTED_TAX_YEAR",
    message: `Tax year ${year} is not supported.`,
    suggestion: "Use taxYear 2024 or 2025. Data is sourced from IRS Rev. Proc. 2023-34 (TY2024) and Rev. Proc. 2024-40 + OBBB Act (TY2025).",
  }),

  invalidState: (code: string, available?: string) => toolError({
    code: "INVALID_STATE",
    message: `State "${code}" not found.`,
    suggestion: available
      ? `Use a valid 2-letter state code. Available: ${available}`
      : "Use a valid 2-letter state code (e.g., CA, TX, NY, FL).",
  }),

  zeroIncome: () => toolError({
    code: "ZERO_INCOME",
    message: "Income must be greater than zero.",
    suggestion: "Enter a positive gross income amount. Include all income sources: W-2, self-employment, investments, etc.",
  }),

  notFound: (item: string, available: string) => toolError({
    code: "NOT_FOUND",
    message: `"${item}" not found.`,
    suggestion: `Available options: ${available}`,
  }),

  notAvailable: (feature: string, reason: string) => toolError({
    code: "NOT_AVAILABLE",
    message: `${feature} is not available.`,
    suggestion: reason,
  }),
};
