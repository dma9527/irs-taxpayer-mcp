/**
 * MCP tool definitions for tax calculations.
 * These tools run entirely locally — no user financial data is transmitted.
 */

import { z } from "zod";
import { type McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { calculateTax } from "../calculators/tax-calculator.js";
import { getTaxYearData, SUPPORTED_TAX_YEARS } from "../data/tax-brackets.js";

const FilingStatusEnum = z.enum([
  "single",
  "married_filing_jointly",
  "married_filing_separately",
  "head_of_household",
]);

export function registerTaxCalculationTools(server: McpServer): void {
  server.tool(
    "calculate_federal_tax",
    "Calculate federal income tax for an individual taxpayer. Supports TY2024 and TY2025. " +
    "Includes bracket breakdown, effective/marginal rates, SE tax, NIIT, Additional Medicare Tax, " +
    "QBI deduction, capital gains, and child tax credit. " +
    "All calculations run locally — no data is sent to any server.",
    {
      taxYear: z.number().describe("Tax year (2024 or 2025)"),
      filingStatus: FilingStatusEnum.describe("Filing status"),
      grossIncome: z.number().min(0).describe("Total gross income in USD"),
      w2Income: z.number().min(0).optional().describe("W-2 wage income"),
      selfEmploymentIncome: z.number().min(0).optional().describe("Self-employment income (Schedule C)"),
      capitalGains: z.number().optional().describe("Long-term capital gains (can be negative for losses)"),
      capitalGainsLongTerm: z.boolean().optional().describe("Whether capital gains are long-term (default: true)"),
      shortTermCapitalGains: z.number().optional().describe("Short-term capital gains (taxed as ordinary income)"),
      qualifiedBusinessIncome: z.number().min(0).optional().describe("Qualified Business Income for Section 199A deduction"),
      aboveTheLineDeductions: z.number().min(0).optional().describe("Above-the-line deductions (HSA, student loan interest, etc.)"),
      itemizedDeductions: z.number().min(0).optional().describe("Total itemized deductions (if greater than standard deduction)"),
      dependents: z.number().int().min(0).optional().describe("Number of qualifying child dependents for Child Tax Credit"),
      age65OrOlder: z.boolean().optional().describe("Taxpayer is 65 or older"),
      blind: z.boolean().optional().describe("Taxpayer is blind"),
    },
    async (params) => {
      try {
        const result = calculateTax(params);
        const lines = [
          `## Federal Tax Calculation — TY${result.taxYear}`,
          `**Filing Status**: ${result.filingStatus.replace(/_/g, " ")}`,
          "",
          `| Item | Amount |`,
          `|------|--------|`,
          `| Gross Income | $${fmt(result.grossIncome)} |`,
          `| Adjusted Gross Income | $${fmt(result.adjustedGrossIncome)} |`,
          `| Deduction (${result.deductionType}) | -$${fmt(result.deductionAmount)} |`,
          result.qbiDeduction > 0 ? `| QBI Deduction (§199A) | -$${fmt(result.qbiDeduction)} |` : "",
          `| Taxable Income | $${fmt(result.taxableIncome)} |`,
          "",
          `### Tax Bracket Breakdown`,
          `| Rate | Taxable Amount | Tax |`,
          `|------|---------------|-----|`,
          ...result.bracketBreakdown.map(
            (b) => `| ${(b.rate * 100).toFixed(0)}% | $${fmt(b.taxableAmount)} | $${fmt(b.tax)} |`
          ),
          "",
          `| Component | Amount |`,
          `|-----------|--------|`,
          `| Ordinary Income Tax | $${fmt(result.ordinaryIncomeTax)} |`,
          result.capitalGainsTax > 0 ? `| Capital Gains Tax | $${fmt(result.capitalGainsTax)} |` : "",
          result.selfEmploymentTax > 0 ? `| Self-Employment Tax | $${fmt(result.selfEmploymentTax)} |` : "",
          result.niit > 0 ? `| Net Investment Income Tax (3.8%) | $${fmt(result.niit)} |` : "",
          result.additionalMedicareTax > 0 ? `| Additional Medicare Tax (0.9%) | $${fmt(result.additionalMedicareTax)} |` : "",
          result.childTaxCredit > 0 ? `| Child Tax Credit | -$${fmt(result.childTaxCredit)} |` : "",
          `| **Total Federal Tax** | **$${fmt(result.totalFederalTax)}** |`,
          "",
          `**Effective Tax Rate**: ${(result.effectiveRate * 100).toFixed(2)}%`,
          `**Marginal Tax Rate**: ${(result.marginalRate * 100).toFixed(0)}%`,
          `**Estimated Quarterly Payment**: $${fmt(result.estimatedQuarterlyPayment)}`,
          "",
          `> ⚠️ This is an estimate for educational purposes only. It does not constitute tax advice. Consult a qualified tax professional for your specific situation.`,
        ].filter(Boolean);

        return { content: [{ type: "text", text: lines.join("\n") }] };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
      }
    }
  );

  server.tool(
    "get_tax_brackets",
    "Get federal income tax brackets and standard deduction for a given tax year and filing status.",
    {
      taxYear: z.number().describe("Tax year (2024 or 2025)"),
      filingStatus: FilingStatusEnum.describe("Filing status"),
    },
    async ({ taxYear, filingStatus }) => {
      const data = getTaxYearData(taxYear);
      if (!data) {
        return {
          content: [{ type: "text", text: `Tax year ${taxYear} not supported. Available: ${SUPPORTED_TAX_YEARS.join(", ")}` }],
          isError: true,
        };
      }

      const brackets = data.brackets[filingStatus];
      const stdDeduction = data.standardDeduction[filingStatus];

      const lines = [
        `## TY${taxYear} Tax Brackets — ${filingStatus.replace(/_/g, " ")}`,
        "",
        `**Standard Deduction**: $${fmt(stdDeduction)}`,
        "",
        `| Rate | Income Range |`,
        `|------|-------------|`,
        ...brackets.map((b) => {
          const max = b.max !== null ? `$${fmt(b.max)}` : "and above";
          return `| ${(b.rate * 100).toFixed(0)}% | $${fmt(b.min)} — ${max} |`;
        }),
        "",
        `**Capital Gains Brackets**:`,
        `| Rate | Up To |`,
        `|------|-------|`,
        ...data.capitalGainsBrackets[filingStatus].map((b) => {
          const threshold = b.threshold === Infinity ? "above" : `$${fmt(b.threshold)}`;
          return `| ${(b.rate * 100).toFixed(0)}% | ${threshold} |`;
        }),
        "",
        `**Social Security Wage Base**: $${fmt(data.socialSecurity.wageBase)}`,
      ];

      return { content: [{ type: "text", text: lines.join("\n") }] };
    }
  );

  server.tool(
    "compare_filing_statuses",
    "Compare tax liability across different filing statuses for the same income. Helps determine the most advantageous filing status.",
    {
      taxYear: z.number().describe("Tax year (2024 or 2025)"),
      grossIncome: z.number().min(0).describe("Total gross income"),
      itemizedDeductions: z.number().min(0).optional().describe("Itemized deductions if applicable"),
      dependents: z.number().int().min(0).optional().describe("Number of qualifying dependents"),
    },
    async (params) => {
      const statuses: Array<"single" | "married_filing_jointly" | "married_filing_separately" | "head_of_household"> = [
        "single",
        "married_filing_jointly",
        "married_filing_separately",
        "head_of_household",
      ];

      const results = statuses.map((status) => {
        try {
          return calculateTax({ ...params, filingStatus: status });
        } catch {
          return null;
        }
      });

      const lines = [
        `## Filing Status Comparison — TY${params.taxYear}`,
        `**Gross Income**: $${fmt(params.grossIncome)}`,
        "",
        `| Filing Status | Deduction | Taxable Income | Federal Tax | Effective Rate |`,
        `|--------------|-----------|---------------|-------------|---------------|`,
        ...results.map((r, i) => {
          if (!r) return `| ${statuses[i]} | — | — | — | — |`;
          return `| ${statuses[i].replace(/_/g, " ")} | $${fmt(r.deductionAmount)} | $${fmt(r.taxableIncome)} | $${fmt(r.totalFederalTax)} | ${(r.effectiveRate * 100).toFixed(2)}% |`;
        }),
      ];

      const best = results
        .filter((r): r is NonNullable<typeof r> => r !== null)
        .sort((a, b) => a.totalFederalTax - b.totalFederalTax)[0];

      if (best) {
        lines.push("", `💡 **Lowest tax**: ${best.filingStatus.replace(/_/g, " ")} at $${fmt(best.totalFederalTax)}`);
      }

      return { content: [{ type: "text", text: lines.join("\n") }] };
    }
  );

  server.tool(
    "estimate_quarterly_tax",
    "Calculate estimated quarterly tax payments (Form 1040-ES) for self-employed or other taxpayers who need to make estimated payments.",
    {
      taxYear: z.number().describe("Tax year"),
      filingStatus: FilingStatusEnum,
      expectedAnnualIncome: z.number().min(0).describe("Expected total annual income"),
      selfEmploymentIncome: z.number().min(0).optional().describe("Expected self-employment income"),
      w2Withholding: z.number().min(0).optional().describe("Expected total W-2 tax withholding for the year"),
      otherCredits: z.number().min(0).optional().describe("Expected other tax credits"),
    },
    async (params) => {
      const result = calculateTax({
        taxYear: params.taxYear,
        filingStatus: params.filingStatus,
        grossIncome: params.expectedAnnualIncome,
        selfEmploymentIncome: params.selfEmploymentIncome,
      });

      const withholding = params.w2Withholding ?? 0;
      const credits = params.otherCredits ?? 0;
      const remainingTax = Math.max(0, result.totalFederalTax - withholding - credits);
      const quarterlyPayment = Math.ceil(remainingTax / 4);

      const lines = [
        `## Estimated Quarterly Tax — TY${params.taxYear}`,
        "",
        `| Item | Amount |`,
        `|------|--------|`,
        `| Estimated Annual Tax | $${fmt(result.totalFederalTax)} |`,
        `| W-2 Withholding | -$${fmt(withholding)} |`,
        credits > 0 ? `| Other Credits | -$${fmt(credits)} |` : "",
        `| Remaining Tax Due | $${fmt(remainingTax)} |`,
        `| **Quarterly Payment** | **$${fmt(quarterlyPayment)}** |`,
        "",
        `> Safe harbor: Pay at least 90% of current year tax or 100% of prior year tax (110% if AGI > $150K) to avoid underpayment penalties.`,
        "",
        `> ⚠️ Estimate only. Consult a tax professional for your specific situation.`,
      ].filter(Boolean);

      return { content: [{ type: "text", text: lines.join("\n") }] };
    }
  );
}

function fmt(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
