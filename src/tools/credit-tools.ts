/**
 * MCP tools for tax credits and retirement strategy lookup.
 */

import { z } from "zod";
import { type McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { TAX_CREDITS } from "../data/credits.js";
import { RETIREMENT_ACCOUNTS, RETIREMENT_STRATEGIES } from "../data/retirement-strategies.js";
import { calculateEITC } from "../calculators/eitc-calculator.js";

export function registerCreditTools(server: McpServer): void {
  server.tool(
    "list_tax_credits",
    "List available federal tax credits with eligibility, amounts, and phase-out rules. " +
    "Covers family, education, energy, retirement, healthcare, and income-based credits.",
    {
      category: z
        .enum(["all", "family", "education", "energy", "retirement", "healthcare", "income", "other"])
        .optional()
        .describe("Filter by category (default: all)"),
      refundableOnly: z.boolean().optional().describe("Only show refundable credits"),
    },
    async ({ category, refundableOnly }) => {
      let credits = TAX_CREDITS;
      ``
      if (category && category !== "all") {
        credits = credits.filter((c) => c.category === category);
      }
      if (refundableOnly) {
        credits = credits.filter((c) => c.refundable === "full" || c.refundable === "partial");
      }

      const sections = credits.map((c) => {
        const refLabel =
          c.refundable === "full" ? "✅ Fully Refundable" :
            c.refundable === "partial" ? "🔶 Partially Refundable" :
              "❌ Non-Refundable";

        return [
          `### ${c.name}`,
          `**${refLabel}** | Category: ${c.category} | Form: ${c.form}`,
          "",
          c.description,
          "",
          `- **Max Amount**: ${c.maxAmount}`,
          `- **Eligibility**: ${c.eligibility}`,
          c.phaseout ? `- **Phase-out**: ${c.phaseout}` : "",
          c.tips ? `- 💡 **Tip**: ${c.tips}` : "",
          "",
        ].filter(Boolean).join("\n");
      });

      const header = `## Federal Tax Credits${category && category !== "all" ? ` — ${category}` : ""}\n\nFound ${credits.length} credits.\n\n`;
      return { content: [{ type: "text", text: header + sections.join("\n") }] };
    }
  );

  server.tool(
    "check_credit_eligibility",
    "Check which tax credits you may be eligible for based on your situation.",
    {
      agi: z.number().min(0).describe("Adjusted Gross Income"),
      filingStatus: z.enum(["single", "married_filing_jointly", "married_filing_separately", "head_of_household"]),
      hasChildren: z.boolean().optional().describe("Have qualifying children under 17"),
      numChildren: z.number().int().min(0).optional(),
      hasChildcare: z.boolean().optional().describe("Pay for childcare to work"),
      isStudent: z.boolean().optional().describe("Currently enrolled in post-secondary education"),
      hasStudentLoans: z.boolean().optional().describe("Paying student loan interest"),
      boughtEV: z.boolean().optional().describe("Purchased an electric vehicle this year"),
      madeHomeImprovements: z.boolean().optional().describe("Made energy-efficient home improvements"),
      installedSolar: z.boolean().optional().describe("Installed solar panels or renewable energy"),
      hasRetirementContributions: z.boolean().optional().describe("Contributed to IRA/401k"),
      hasMarketplaceInsurance: z.boolean().optional().describe("Bought health insurance through ACA marketplace"),
      hasEarnedIncome: z.boolean().optional().describe("Has earned income from work"),
      paidForeignTax: z.boolean().optional().describe("Paid income tax to a foreign country"),
    },
    async (params) => {
      const eligible: string[] = [];
      const maybeEligible: string[] = [];
      const notEligible: string[] = [];

      // Child Tax Credit
      if (params.hasChildren && params.numChildren && params.numChildren > 0) {
        const ctcPhaseout = params.filingStatus === "married_filing_jointly" ? 400000 : 200000;
        if (params.agi <= ctcPhaseout) {
          eligible.push(`✅ **Child Tax Credit**: $${(params.numChildren * 2000).toLocaleString()} (${params.numChildren} children × $2,000)`);
        } else {
          maybeEligible.push(`🔶 **Child Tax Credit**: Partially phased out at your AGI. Reduced by $50 per $1,000 over $${ctcPhaseout.toLocaleString()}`);
        }
      }

      // Child and Dependent Care
      if (params.hasChildcare) {
        eligible.push("✅ **Child and Dependent Care Credit**: 20-35% of up to $3,000/$6,000 in care expenses");
      }

      // EITC
      if (params.hasEarnedIncome) {
        const eitcLimits: Record<string, number> = {
          "0": 18591, "1": 49084, "2": 55768, "3": 59899,
        };
        const children = Math.min(params.numChildren ?? 0, 3);
        const limit = params.filingStatus === "married_filing_jointly"
          ? (eitcLimits[String(children)] ?? 18591) + 7430
          : eitcLimits[String(children)] ?? 18591;

        if (params.agi <= limit) {
          eligible.push(`✅ **Earned Income Tax Credit (EITC)**: Likely eligible. Fully refundable. Check exact amount with calculate tool`);
        }
      }

      // Education
      if (params.isStudent) {
        const aotcLimit = params.filingStatus === "married_filing_jointly" ? 180000 : 90000;
        if (params.agi <= aotcLimit) {
          eligible.push("✅ **American Opportunity Tax Credit**: Up to $2,500/student (40% refundable). First 4 years of college");
        }
        eligible.push("✅ **Lifetime Learning Credit**: Up to $2,000/return for any post-secondary education");
      }

      if (params.hasStudentLoans) {
        const slLimit = params.filingStatus === "married_filing_jointly" ? 195000 : 95000;
        if (params.agi <= slLimit && params.filingStatus !== "married_filing_separately") {
          eligible.push("✅ **Student Loan Interest Deduction**: Up to $2,500 above-the-line deduction");
        }
      }

      // Energy
      if (params.boughtEV) {
        const evLimit = params.filingStatus === "married_filing_jointly" ? 300000 : 150000;
        if (params.agi <= evLimit) {
          eligible.push("✅ **Clean Vehicle Credit**: Up to $7,500 for qualifying new EV");
        } else {
          notEligible.push("❌ **Clean Vehicle Credit**: AGI exceeds income limit");
        }
      }

      if (params.installedSolar) {
        eligible.push("✅ **Residential Clean Energy Credit**: 30% of solar/renewable energy system costs (no cap)");
      }

      if (params.madeHomeImprovements) {
        eligible.push("✅ **Energy Efficient Home Improvement Credit**: 30% of costs, up to $3,200/year");
      }

      // Retirement
      if (params.hasRetirementContributions) {
        const saverLimits: Record<string, number> = {
          single: 38250, married_filing_jointly: 76500,
          married_filing_separately: 38250, head_of_household: 57375,
        };
        if (params.agi <= (saverLimits[params.filingStatus] ?? 38250)) {
          eligible.push("✅ **Saver's Credit**: 10-50% of retirement contributions, up to $1,000 ($2,000 MFJ)");
        }
      }

      // Healthcare
      if (params.hasMarketplaceInsurance) {
        eligible.push("✅ **Premium Tax Credit**: Sliding scale based on income. Fully refundable");
      }

      // Foreign Tax
      if (params.paidForeignTax) {
        eligible.push("✅ **Foreign Tax Credit**: Credit for foreign income taxes paid");
      }

      const lines = [
        `## Tax Credit Eligibility Check`,
        `**AGI**: $${params.agi.toLocaleString()} | **Filing**: ${params.filingStatus.replace(/_/g, " ")}`,
        "",
        eligible.length > 0 ? "### Likely Eligible\n" + eligible.join("\n\n") : "",
        maybeEligible.length > 0 ? "\n### Possibly Eligible (check details)\n" + maybeEligible.join("\n\n") : "",
        notEligible.length > 0 ? "\n### Not Eligible\n" + notEligible.join("\n\n") : "",
        "",
        "> ⚠️ This is a preliminary screening. Actual eligibility depends on many factors. Consult a tax professional.",
      ].filter(Boolean);

      return { content: [{ type: "text", text: lines.join("\n") }] };
    }
  );

  server.tool(
    "get_retirement_accounts",
    "Get details on retirement account types — contribution limits, tax treatment, income limits, and tips.",
    {
      accountType: z.string().optional().describe("Specific account (e.g., 'roth_ira', '401k', 'hsa', 'sep_ira'). Leave empty for all"),
    },
    async ({ accountType }) => {
      const accounts = accountType
        ? RETIREMENT_ACCOUNTS.filter((a) => a.id === accountType)
        : RETIREMENT_ACCOUNTS;

      if (accounts.length === 0) {
        const ids = RETIREMENT_ACCOUNTS.map((a) => a.id).join(", ");
        return { content: [{ type: "text", text: `Account "${accountType}" not found. Available: ${ids}` }], isError: true };
      }

      const sections = accounts.map((a) => [
        `### ${a.name}`,
        a.description,
        "",
        `| Detail | Info |`,
        `|--------|------|`,
        `| TY2024 Limit | ${a.contributionLimit2024} |`,
        `| TY2025 Limit | ${a.contributionLimit2025} |`,
        `| Catch-up | ${a.catchUp} |`,
        `| Tax Treatment | ${a.taxTreatment} |`,
        a.incomeLimit ? `| Income Limit | ${a.incomeLimit} |` : "",
        `| RMDs Required | ${a.rmdRequired ? "Yes" : "No"} |`,
        a.tips ? `\n💡 ${a.tips}` : "",
        "",
      ].filter(Boolean).join("\n"));

      return { content: [{ type: "text", text: `## Retirement Accounts\n\n${sections.join("\n")}` }] };
    }
  );

  server.tool(
    "get_retirement_strategy",
    "Get detailed info on tax-advantaged retirement strategies like Backdoor Roth, Mega Backdoor Roth, Roth Conversion Ladder, Tax Loss/Gain Harvesting.",
    {
      strategyId: z.string().optional().describe("Strategy ID (e.g., 'backdoor_roth', 'mega_backdoor_roth', 'roth_conversion_ladder', 'tax_loss_harvesting', 'tax_gain_harvesting'). Leave empty for all"),
    },
    async ({ strategyId }) => {
      const strategies = strategyId
        ? RETIREMENT_STRATEGIES.filter((s) => s.id === strategyId)
        : RETIREMENT_STRATEGIES;

      if (strategies.length === 0) {
        const ids = RETIREMENT_STRATEGIES.map((s) => s.id).join(", ");
        return { content: [{ type: "text", text: `Strategy "${strategyId}" not found. Available: ${ids}` }], isError: true };
      }

      const sections = strategies.map((s) => [
        `### ${s.name}`,
        s.description,
        "",
        `**Annual Limit**: ${s.annualLimit}`,
        `**Tax Benefit**: ${s.taxBenefit}`,
        "",
        `**Eligibility**: ${s.eligibility}`,
        "",
        `**Steps:**`,
        ...s.steps,
        "",
        `**⚠️ Risks & Considerations:**`,
        ...s.risks.map((r) => `- ${r}`),
        "",
      ].join("\n"));

      return { content: [{ type: "text", text: `## Tax-Advantaged Strategies\n\n${sections.join("\n")}` }] };
    }
  );

  server.tool(
    "calculate_eitc",
    "Calculate the exact Earned Income Tax Credit (EITC) amount. " +
    "The EITC is one of the largest refundable credits for low-to-moderate income workers.",
    {
      taxYear: z.number().describe("Tax year (2024 or 2025)"),
      filingStatus: z.enum(["single", "married_filing_jointly", "married_filing_separately", "head_of_household"]),
      earnedIncome: z.number().min(0).describe("Earned income (wages, salary, self-employment)"),
      agi: z.number().min(0).describe("Adjusted Gross Income"),
      qualifyingChildren: z.number().int().min(0).max(3).describe("Number of qualifying children (0-3)"),
      investmentIncome: z.number().min(0).optional().describe("Investment income (interest, dividends, capital gains)"),
    },
    async (params) => {
      const result = calculateEITC(params);

      if (!result.eligible) {
        const lines = [
          `## EITC Calculation — TY${params.taxYear}`,
          "",
          `❌ **Not eligible for EITC**`,
          result.reason ? `Reason: ${result.reason}` : `Income exceeds the limit for ${result.qualifyingChildren} qualifying children.`,
          "",
          `> The EITC is available for earned income up to ~$${result.incomeLimit > 0 ? result.incomeLimit.toLocaleString() : "varies"} (depending on filing status and children).`,
        ];
        return { content: [{ type: "text", text: lines.join("\n") }] };
      }

      const lines = [
        `## EITC Calculation — TY${params.taxYear}`,
        "",
        `| Item | Value |`,
        `|------|-------|`,
        `| Filing Status | ${params.filingStatus.replace(/_/g, " ")} |`,
        `| Earned Income | $${params.earnedIncome.toLocaleString()} |`,
        `| AGI | $${params.agi.toLocaleString()} |`,
        `| Qualifying Children | ${result.qualifyingChildren} |`,
        `| Phase | ${result.phase} |`,
        `| Max Possible Credit | $${result.maxPossibleCredit.toLocaleString()} |`,
        `| **Your EITC** | **$${result.credit.toLocaleString()}** |`,
        "",
        `✅ **Fully refundable** — you get this even if you owe no tax.`,
        "",
        result.phase === "phase-in" ? `📈 Your credit increases as your income rises (up to $${result.maxPossibleCredit.toLocaleString()}).` : "",
        result.phase === "phase-out" ? `📉 Your credit is being reduced as income exceeds the phase-out threshold.` : "",
        "",
        `> ⚠️ EITC refunds are typically delayed until mid-February. File early to get your refund sooner.`,
      ].filter(Boolean);

      return { content: [{ type: "text", text: lines.join("\n") }] };
    }
  );
}
