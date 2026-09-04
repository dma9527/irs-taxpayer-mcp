/**
 * MCP tools for state income tax lookup and estimation.
 */

import { z } from "zod";
import { type McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { STATE_TAX_DATA, getStateInfo, getNoIncomeTaxStates, type StateTaxType } from "../data/state-taxes.js";
import {
  calculateStateTax,
  UnsupportedStateTaxCalculationError,
} from "../calculators/state-tax-calculator.js";
import { ERRORS } from "./error-handler.js";

export function registerStateTaxTools(server: McpServer): void {
  server.tool(
    "get_state_tax_info",
    "Get state income tax information — rates, brackets, and key details for any US state.",
    {
      stateCode: z.string().length(2).describe("Two-letter state code (e.g., 'CA', 'TX', 'NY')"),
    },
    async ({ stateCode }) => {
      const state = getStateInfo(stateCode);
      if (!state) {
        const codes = Object.keys(STATE_TAX_DATA).sort().join(", ");
        return ERRORS.invalidState(stateCode, codes);
      }

      const lines = [
        `## ${state.name} (${state.code}) — State Income Tax`,
        "",
        `**Tax Type**: ${state.taxType === "none" ? "No Income Tax 🎉" : state.taxType === "flat" ? "Flat Rate" : "Graduated Brackets"}`,
        state.taxType !== "none" ? `**Top Marginal Rate**: ${(state.topRate * 100).toFixed(2)}%` : "",
      ];

      if (state.brackets && state.brackets.length > 0) {
        lines.push(
          "",
          `| Rate | Income Range (Single) |`,
          `|------|----------------------|`,
          ...state.brackets.map((b) => {
            const max = b.max !== null ? `$${b.max.toLocaleString()}` : "and above";
            return `| ${(b.rate * 100).toFixed(2)}% | $${b.min.toLocaleString()} — ${max} |`;
          })
        );
      }

      if (state.standardDeduction) {
        lines.push(
          "",
          `**Standard Deduction**: $${state.standardDeduction.single.toLocaleString()} (single) / $${state.standardDeduction.married.toLocaleString()} (married)`
        );
      }

      if (state.personalExemption) {
        lines.push(
          `**Personal Exemption**: $${state.personalExemption.single.toLocaleString()} (single) / $${state.personalExemption.married.toLocaleString()} (married)`
        );
      }

      if (state.localTaxes) {
        lines.push("", "⚠️ **Local taxes**: This state has additional city/county income taxes");
        if (state.localTaxData && state.localTaxData.length > 0) {
          lines.push(
            "",
            "| Locality | Resident Rate | Non-Resident Rate | Notes |",
            "|----------|-------------|-------------------|-------|",
            ...state.localTaxData.map((lt) => {
              const resRate = `${(lt.rate * 100).toFixed(2)}%`;
              const nonResRate = lt.nonResidentRate ? `${(lt.nonResidentRate * 100).toFixed(2)}%` : "—";
              return `| ${lt.name} | ${resRate} | ${nonResRate} | ${lt.notes ?? ""} |`;
            })
          );
        }
      }

      if (state.notes) {
        lines.push("", `📝 **Note**: ${state.notes}`);
      }

      if (state.saltDeductionOnFederal) {
        lines.push("", "💡 State income taxes paid are deductible on federal return (subject to SALT cap — $10K for TY2024, $40K for TY2025)");
      }

      return { content: [{ type: "text", text: lines.filter(Boolean).join("\n") }] };
    }
  );

  server.tool(
    "estimate_state_tax",
    "Estimate state income tax for a given income and state. Simplified calculation using state brackets.",
    {
      stateCode: z.string().length(2).describe("Two-letter state code"),
      incomeBeforeStateDeductions: z.number().min(0).optional().describe("State income before the modeled state standard deduction and personal exemption"),
      taxableIncome: z.number().min(0).optional().describe("Deprecated alias for incomeBeforeStateDeductions"),
      filingStatus: z.enum(["single", "married"]).optional().describe("Filing status (default: single)"),
    },
    async ({ stateCode, incomeBeforeStateDeductions, taxableIncome, filingStatus }) => {
      const state = getStateInfo(stateCode);
      if (!state) {
        return ERRORS.invalidState(stateCode);
      }

      const hasExplicitIncome = incomeBeforeStateDeductions !== undefined;
      const hasLegacyIncome = taxableIncome !== undefined;
      if (hasExplicitIncome === hasLegacyIncome) {
        return {
          content: [{
            type: "text",
            text: "Provide exactly one of incomeBeforeStateDeductions or taxableIncome.",
          }],
          isError: true,
        };
      }
      const stateIncome = incomeBeforeStateDeductions ?? taxableIncome;
      if (stateIncome === undefined) {
        return {
          content: [{ type: "text", text: "State income before deductions is required." }],
          isError: true,
        };
      }
      const usedLegacyIncome = !hasExplicitIncome;

      if (state.taxType === "none") {
        return {
          content: [{
            type: "text",
            text: `## ${state.name} — No State Income Tax 🎉\n\nEstimated state tax: $0\n\n${state.notes ?? ""}${usedLegacyIncome ? "\n\n> ⚠️ taxableIncome is deprecated; use incomeBeforeStateDeductions." : ""}`,
          }],
        };
      }

      const status = filingStatus ?? "single";
      let result: ReturnType<typeof calculateStateTax>;
      try {
        result = calculateStateTax({
          stateCode,
          incomeBeforeDeductions: stateIncome,
          filingStatus: status,
        });
      } catch (error: unknown) {
        if (error instanceof UnsupportedStateTaxCalculationError) {
          return {
            content: [{ type: "text", text: error.message }],
            isError: true,
          };
        }
        throw error;
      }

      if (!result) {
        return ERRORS.invalidState(stateCode);
      }

      const { adjustedIncome, deduction, tax, effectiveRate } = result;

      const lines = [
        `## ${state.name} — Estimated State Tax`,
        "",
        `| Item | Amount |`,
        `|------|--------|`,
        `| Income Before State Deductions | $${stateIncome.toLocaleString()} |`,
        deduction > 0 ? `| State Deductions | -$${deduction.toLocaleString()} |` : "",
        `| Taxable Income | $${adjustedIncome.toLocaleString()} |`,
        `| **Estimated State Tax** | **$${Math.round(tax).toLocaleString()}** |`,
        `| Effective State Rate | ${(effectiveRate * 100).toFixed(2)}% |`,
        "",
        state.localTaxes ? "⚠️ Does not include local/city income taxes" : "",
        state.notes ? `📝 ${state.notes}` : "",
        usedLegacyIncome ? "> ⚠️ taxableIncome is deprecated; use incomeBeforeStateDeductions." : "",
        "",
        "> This is a simplified estimate. State tax rules vary significantly. Consult a tax professional for accuracy.",
      ].filter(Boolean);

      return { content: [{ type: "text", text: lines.join("\n") }] };
    }
  );

  server.tool(
    "compare_state_taxes",
    "Compare state income tax across multiple states for the same income. Useful for relocation decisions.",
    {
      states: z.array(z.string().length(2)).min(2).max(10).describe("Array of state codes to compare (e.g., ['CA', 'TX', 'WA', 'NY'])"),
      incomeBeforeStateDeductions: z.number().min(0).optional().describe("Annual income before modeled state deductions"),
      taxableIncome: z.number().min(0).optional().describe("Deprecated alias for incomeBeforeStateDeductions"),
      filingStatus: z.enum(["single", "married"]).optional().describe("Filing status (default: single)"),
    },
    async ({ states, incomeBeforeStateDeductions, taxableIncome, filingStatus }) => {
      const hasExplicitIncome = incomeBeforeStateDeductions !== undefined;
      const hasLegacyIncome = taxableIncome !== undefined;
      if (hasExplicitIncome === hasLegacyIncome) {
        return {
          content: [{
            type: "text",
            text: "Provide exactly one of incomeBeforeStateDeductions or taxableIncome.",
          }],
          isError: true,
        };
      }
      const stateIncome = incomeBeforeStateDeductions ?? taxableIncome;
      if (stateIncome === undefined) {
        return {
          content: [{ type: "text", text: "State income before deductions is required." }],
          isError: true,
        };
      }
      const status = filingStatus ?? "single";
      const results: Array<{
        code: string;
        name: string;
        tax: number;
        rate: number;
        type: StateTaxType;
      }> = [];

      for (const code of states) {
        const state = getStateInfo(code);
        if (!state) {
          return ERRORS.invalidState(code);
        }

        let result: ReturnType<typeof calculateStateTax>;
        try {
          result = calculateStateTax({
            stateCode: code,
            incomeBeforeDeductions: stateIncome,
            filingStatus: status,
          });
        } catch (error: unknown) {
          if (error instanceof UnsupportedStateTaxCalculationError) {
            return {
              content: [{ type: "text", text: error.message }],
              isError: true,
            };
          }
          throw error;
        }

        if (!result) {
          return ERRORS.invalidState(code);
        }

        results.push({
          code: result.stateCode,
          name: result.stateName,
          tax: result.tax,
          rate: result.effectiveRate,
          type: result.taxType,
        });
      }

      results.sort((a, b) => a.tax - b.tax);

      const lines = [
        `## State Tax Comparison — $${stateIncome.toLocaleString()} Income Before State Deductions`,
        "",
        `| Rank | State | Tax Type | Est. Tax | Effective Rate |`,
        `|------|-------|----------|----------|---------------|`,
        ...results.map((r, i) => {
          const typeLabel = r.type === "none" ? "No tax" : r.type === "flat" ? "Flat" : "Graduated";
          return `| ${i + 1} | ${r.name} (${r.code}) | ${typeLabel} | $${r.tax.toLocaleString()} | ${(r.rate * 100).toFixed(2)}% |`;
        }),
        "",
        `💡 **Lowest tax**: ${results[0].name} at $${results[0].tax.toLocaleString()}`,
        results.length > 1 ? `💸 **Highest tax**: ${results[results.length - 1].name} at $${results[results.length - 1].tax.toLocaleString()}` : "",
        results.length > 1 ? `📊 **Difference**: $${(results[results.length - 1].tax - results[0].tax).toLocaleString()}/year` : "",
        "",
        "> Simplified estimates. Does not include local taxes, property taxes, or sales tax differences.",
      ].filter(Boolean);

      return { content: [{ type: "text", text: lines.join("\n") }] };
    }
  );

  server.tool(
    "list_no_income_tax_states",
    "List all US states with no state income tax.",
    {},
    async () => {
      const states = getNoIncomeTaxStates();
      const lines = [
        `## States With No Income Tax`,
        "",
        `| State | Notes |`,
        `|-------|-------|`,
        ...states.map((s) => `| ${s.name} (${s.code}) | ${s.notes ?? "No income tax"} |`),
        "",
        `> Note: Some of these states have higher property taxes or sales taxes to compensate. Consider total tax burden, not just income tax.`,
      ];

      return { content: [{ type: "text", text: lines.join("\n") }] };
    }
  );
}
