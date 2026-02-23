/**
 * Shared utilities for MCP tool implementations.
 */

import { z } from "zod";

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
