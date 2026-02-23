/**
 * MCP tools for deduction analysis and lookup.
 */

import { z } from "zod";
import { type McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ITEMIZED_DEDUCTIONS, ABOVE_THE_LINE_DEDUCTIONS } from "../data/deductions.js";
import { getTaxYearData, getSaltCap } from "../data/tax-brackets.js";
import { ERRORS } from "./error-handler.js";
import { fmt } from "./shared.js";

export function registerDeductionTools(server: McpServer): void {
  server.tool(
    "list_deductions",
    "List available tax deductions with eligibility rules and limits. Covers both above-the-line and itemized deductions.",
    {
      category: z
        .enum(["all", "above_the_line", "itemized", "medical", "taxes", "interest", "charity", "other"])
        .optional()
        .describe("Filter by deduction category (default: all)"),
    },
    async ({ category }) => {
      const cat = category ?? "all";
      const sections: string[] = [];

      if (cat === "all" || cat === "above_the_line") {
        sections.push(
          "## Above-the-Line Deductions (reduce AGI)",
          "",
          ...ABOVE_THE_LINE_DEDUCTIONS.map(
            (d) => `### ${d.name}\n- ${d.description}\n- **Limit**: ${d.limit}\n- **Form**: ${d.form}\n`
          )
        );
      }

      if (cat === "all" || cat === "itemized" || ["medical", "taxes", "interest", "charity", "other"].includes(cat)) {
        const filtered =
          cat === "all" || cat === "itemized"
            ? ITEMIZED_DEDUCTIONS
            : ITEMIZED_DEDUCTIONS.filter((d) => d.category === cat);

        sections.push(
          "## Itemized Deductions (Schedule A)",
          "",
          ...filtered.map(
            (d) =>
              `### ${d.name}\n- ${d.description}\n- **Limit**: ${d.limit ?? "None"}\n- **Eligibility**: ${d.eligibility}\n- **Form**: ${d.form}${d.line ? ` (${d.line})` : ""}\n`
          )
        );
      }

      return { content: [{ type: "text", text: sections.join("\n") }] };
    }
  );

  server.tool(
    "standard_vs_itemized",
    "Compare standard deduction vs itemized deductions to determine which is more beneficial.",
    {
      taxYear: z.number().describe("Tax year (2024 or 2025)"),
      filingStatus: z.enum(["single", "married_filing_jointly", "married_filing_separately", "head_of_household"]),
      medicalExpenses: z.number().min(0).optional().describe("Unreimbursed medical expenses"),
      stateLocalTaxes: z.number().min(0).optional().describe("State/local income + property taxes paid"),
      mortgageInterest: z.number().min(0).optional().describe("Home mortgage interest paid"),
      charitableDonations: z.number().min(0).optional().describe("Charitable contributions"),
      otherItemized: z.number().min(0).optional().describe("Other itemized deductions"),
      agi: z.number().min(0).describe("Adjusted Gross Income (needed for medical expense threshold)"),
      age65OrOlder: z.boolean().optional(),
      blind: z.boolean().optional(),
    },
    async (params) => {
      const data = getTaxYearData(params.taxYear);
      if (!data) {
        return ERRORS.unsupportedYear(params.taxYear);
      }

      // Standard deduction
      let stdDeduction = data.standardDeduction[params.filingStatus];
      const additional = data.additionalDeduction.age65OrBlind[params.filingStatus];
      if (params.age65OrOlder) stdDeduction += additional;
      if (params.blind) stdDeduction += additional;

      // Itemized calculation
      const medical = Math.max(0, (params.medicalExpenses ?? 0) - params.agi * 0.075);
      const saltCapAmount = getSaltCap(params.taxYear, params.filingStatus, params.agi);
      const salt = Math.min(params.stateLocalTaxes ?? 0, saltCapAmount);
      const mortgage = params.mortgageInterest ?? 0;
      const charity = params.charitableDonations ?? 0;
      const other = params.otherItemized ?? 0;
      const totalItemized = medical + salt + mortgage + charity + other;

      const recommendation = totalItemized > stdDeduction ? "itemized" : "standard";
      const savings = Math.abs(totalItemized - stdDeduction);

      const lines = [
        `## Standard vs Itemized Deduction — TY${params.taxYear}`,
        "",
        `| Itemized Component | Amount |`,
        `|-------------------|--------|`,
        `| Medical (above 7.5% AGI) | $${fmt(medical)} |`,
        `| SALT (capped) | $${fmt(salt)} |`,
        `| Mortgage Interest | $${fmt(mortgage)} |`,
        `| Charitable | $${fmt(charity)} |`,
        other > 0 ? `| Other | $${fmt(other)} |` : "",
        `| **Total Itemized** | **$${fmt(totalItemized)}** |`,
        "",
        `**Standard Deduction**: $${fmt(stdDeduction)}`,
        "",
        `💡 **Recommendation**: Take the **${recommendation} deduction** — saves $${fmt(savings)} more.`,
      ].filter(Boolean);

      return { content: [{ type: "text", text: lines.join("\n") }] };
    }
  );
}

