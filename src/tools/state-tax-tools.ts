/**
 * MCP tools for state income tax lookup and estimation.
 */

import { z } from "zod";
import { type McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { STATE_TAX_DATA, getStateInfo, getNoIncomeTaxStates, type StateBracket } from "../data/state-taxes.js";
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
      taxableIncome: z.number().min(0).describe("State taxable income (after state deductions)"),
      filingStatus: z.enum(["single", "married"]).optional().describe("Filing status (default: single)"),
    },
    async ({ stateCode, taxableIncome, filingStatus }) => {
      const state = getStateInfo(stateCode);
      if (!state) {
        return ERRORS.invalidState(stateCode);
      }

      if (state.taxType === "none") {
        return {
          content: [{
            type: "text",
            text: `## ${state.name} — No State Income Tax 🎉\n\nEstimated state tax: $0\n\n${state.notes ?? ""}`,
          }],
        };
      }

      const status = filingStatus ?? "single";
      let tax = 0;
      let deduction = 0;

      if (state.standardDeduction) {
        deduction = status === "married" ? state.standardDeduction.married : state.standardDeduction.single;
      }
      if (state.personalExemption) {
        deduction += status === "married" ? state.personalExemption.married : state.personalExemption.single;
      }

      const adjustedIncome = Math.max(0, taxableIncome - deduction);

      if (state.taxType === "flat") {
        tax = adjustedIncome * state.topRate;
      } else if (state.brackets && state.brackets.length > 0) {
        tax = calculateGraduatedTax(adjustedIncome, state.brackets);
      } else {
        // Fallback: use top rate as approximation
        tax = adjustedIncome * state.topRate;
      }

      const effectiveRate = taxableIncome > 0 ? tax / taxableIncome : 0;

      const lines = [
        `## ${state.name} — Estimated State Tax`,
        "",
        `| Item | Amount |`,
        `|------|--------|`,
        `| Gross State Income | $${taxableIncome.toLocaleString()} |`,
        deduction > 0 ? `| State Deductions | -$${deduction.toLocaleString()} |` : "",
        `| Taxable Income | $${adjustedIncome.toLocaleString()} |`,
        `| **Estimated State Tax** | **$${Math.round(tax).toLocaleString()}** |`,
        `| Effective State Rate | ${(effectiveRate * 100).toFixed(2)}% |`,
        "",
        state.localTaxes ? "⚠️ Does not include local/city income taxes" : "",
        state.notes ? `📝 ${state.notes}` : "",
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
      taxableIncome: z.number().min(0).describe("Annual taxable income"),
    },
    async ({ states, taxableIncome }) => {
      const results = states.map((code) => {
        const state = getStateInfo(code);
        if (!state) return { code, name: "Unknown", tax: 0, rate: 0, type: "unknown" as const };

        let tax = 0;
        if (state.taxType === "none") {
          tax = 0;
        } else if (state.taxType === "flat") {
          tax = taxableIncome * state.topRate;
        } else if (state.brackets) {
          tax = calculateGraduatedTax(taxableIncome, state.brackets);
        } else {
          tax = taxableIncome * state.topRate;
        }

        return {
          code: state.code,
          name: state.name,
          tax: Math.round(tax),
          rate: taxableIncome > 0 ? tax / taxableIncome : 0,
          type: state.taxType,
        };
      });

      results.sort((a, b) => a.tax - b.tax);

      const lines = [
        `## State Tax Comparison — $${taxableIncome.toLocaleString()} Income`,
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

function calculateGraduatedTax(income: number, brackets: StateBracket[]): number {
  let tax = 0;
  let remaining = income;

  for (const bracket of brackets) {
    if (remaining <= 0) break;
    const bracketSize = bracket.max !== null ? bracket.max - bracket.min : Infinity;
    const taxable = Math.min(remaining, bracketSize);
    tax += taxable * bracket.rate;
    remaining -= taxable;
  }

  return tax;
}
