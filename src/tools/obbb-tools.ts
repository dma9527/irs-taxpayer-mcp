/**
 * MCP tools for One Big Beautiful Bill Act (OBBB) new deductions.
 * Effective TY2025-2028: tips, overtime, senior bonus, auto loan interest.
 */

import { z } from "zod";
import { fmt, FilingStatusEnum, registerTaxTool } from "./shared.js";
import { type McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getTaxYearData, SUPPORTED_TAX_YEARS, type FilingStatus } from "../data/tax-brackets.js";
import { calculateScheduleOneADeductions } from "../calculators/tax-calculator.js";
import { getLawChangesEffectiveBetween, type LawChangeModeling } from "../data/law-changes.js";
import { ERRORS } from "./error-handler.js";



export function registerObbbTools(server: McpServer): void {

  registerTaxTool(server,
    "calculate_obbb_deductions",
    "Calculate all OBBB (One Big Beautiful Bill) new deductions for TY2025+: " +
    "tips income deduction, overtime pay deduction, senior bonus deduction, and auto loan interest deduction. " +
    "Shows which deductions you qualify for and the total tax savings.",
    {
      taxYear: z.number().describe("Tax year (2025+)"),
      filingStatus: FilingStatusEnum,
      agi: z.number().min(0).describe("Adjusted Gross Income"),
      age: z.number().int().min(0).optional().describe("Taxpayer age (needed for senior bonus)"),
      spouseAge: z.number().int().min(0).optional().describe("Spouse age if MFJ"),
      tipIncome: z.number().min(0).optional().describe("Annual tip income from qualifying occupation"),
      overtimePay: z.number().min(0).optional().describe("Annual overtime premium pay"),
      autoLoanInterest: z.number().min(0).optional().describe("Interest paid on qualifying US-assembled new vehicle loan"),
      marginalRate: z.number().min(0).max(1).optional().describe("Your marginal tax rate (for savings estimate, e.g. 0.22)"),
    },
    async (params) => {
      const data = getTaxYearData(params.taxYear);
      if (!data) {
        return ERRORS.unsupportedYear(params.taxYear);
      }

      const obbb = data.obbbDeductions;
      if (!obbb) {
        return {
          content: [{
            type: "text",
            text: `## OBBB Deductions Not Available for TY${params.taxYear}\n\nThe One Big Beautiful Bill Act deductions (tips, overtime, senior bonus, auto loan interest) are only available for TY2025 and later.`,
          }],
        };
      }

      const isMFJ = params.filingStatus === "married_filing_jointly";
      const rate = params.marginalRate ?? 0.22;
      const deductions: Array<{ name: string; amount: number; max: number; eligible: boolean; reason?: string }> = [];

      const isMFS = params.filingStatus === "married_filing_separately";
      const age = params.age ?? 0;
      const spouseAge = params.spouseAge ?? 0;
      const seniorCount = (age >= 65 ? 1 : 0) + (isMFJ && spouseAge >= 65 ? 1 : 0);
      const scheduleOneA = calculateScheduleOneADeductions(data, params.filingStatus, params.agi, {
        qualifiedTips: params.tipIncome,
        qualifiedOvertimeCompensation: params.overtimePay,
        qualifiedVehicleLoanInterest: params.autoLoanInterest,
        seniorCount,
      });
      const addDeduction = (name: string, amount: number, max: number, jointReturnRequired: boolean) => {
        const rounded = Math.round(amount);
        deductions.push({
          name,
          amount: rounded,
          max,
          eligible: rounded > 0,
          reason: rounded > 0
            ? undefined
            : jointReturnRequired ? "Married taxpayers must file jointly" : "Fully phased out by MAGI",
        });
      };

      if (seniorCount > 0) {
        addDeduction("Senior Bonus Deduction (65+)", scheduleOneA.senior, seniorCount * obbb.seniorBonus.amount, isMFS);
      } else if (age > 0) {
        deductions.push({ name: "Senior Bonus Deduction (65+)", amount: 0, max: obbb.seniorBonus.amount, eligible: false, reason: "Must be age 65 or older" });
      }
      if ((params.tipIncome ?? 0) > 0) {
        addDeduction("Tips Income Deduction", scheduleOneA.tips, obbb.tipsDeduction.max, isMFS);
      }
      if ((params.overtimePay ?? 0) > 0) {
        const overtimeMax = isMFJ ? obbb.overtimeDeduction.maxMFJ : obbb.overtimeDeduction.maxSingle;
        addDeduction("Overtime Pay Deduction", scheduleOneA.overtime, overtimeMax, isMFS);
      }
      if ((params.autoLoanInterest ?? 0) > 0) {
        addDeduction("Auto Loan Interest Deduction", scheduleOneA.vehicleLoanInterest, obbb.autoLoanInterest.max, false);
      }

      const totalDeduction = deductions.reduce((sum, d) => sum + d.amount, 0);
      const estimatedSavings = Math.round(totalDeduction * rate);

      const lines = [
        `## OBBB New Deductions — TY${params.taxYear}`,
        `**Filing**: ${params.filingStatus.replace(/_/g, " ")} | **AGI**: $${fmt(params.agi)}`,
        "",
        `| Deduction | Amount | Max | Status |`,
        `|-----------|--------|-----|--------|`,
        ...deductions.map((d) => {
          const status = d.eligible ? `✅ $${fmt(d.amount)}` : `❌ ${d.reason}`;
          return `| ${d.name} | $${fmt(d.amount)} | $${fmt(d.max)} | ${status} |`;
        }),
        "",
        `| **Total OBBB Deductions** | **$${fmt(totalDeduction)}** | | |`,
        `| Estimated Tax Savings (${(rate * 100).toFixed(0)}% rate) | **$${fmt(estimatedSavings)}** | | |`,
        "",
      ];

      if (deductions.length === 0) {
        lines.push("No OBBB deduction inputs provided. Enter tip income, overtime pay, age, or auto loan interest to see eligible deductions.");
      }

      lines.push(
        "",
        `> 📝 These deductions are available TY2025-2028. Tips and overtime deductions still subject to SS/Medicare payroll taxes.`,
        `> ⚠️ Auto loan interest deduction requires a new, US-assembled vehicle. Leases do not qualify.`,
      );

      return { content: [{ type: "text", text: lines.join("\n") }] };
    }
  );

  registerTaxTool(server,
    "what_changed_between_tax_years",
    "Show all differences between two tax years — bracket changes, deduction limits, credit amounts, " +
    "SALT cap, CTC, and new OBBB provisions. Great for understanding how tax law changes affect you.",
    {
      fromYear: z.number().describe("Earlier tax year (e.g., 2024)"),
      toYear: z.number().describe("Later tax year (e.g., 2025)"),
      filingStatus: FilingStatusEnum.optional().describe("Filing status for specific comparisons (default: single)"),
    },
    async ({ fromYear, toYear, filingStatus }) => {
      const from = getTaxYearData(fromYear);
      const to = getTaxYearData(toYear);
      if (!from || !to) {
        const supported = SUPPORTED_TAX_YEARS.join(", ");
        return { content: [{ type: "text", text: `One or both tax years not supported. Available: ${supported}` }], isError: true };
      }

      const status: FilingStatus = filingStatus ?? "single";
      const lines = [
        `## What Changed: TY${fromYear} → TY${toYear}`,
        `**Filing Status**: ${status.replace(/_/g, " ")}`,
        "",
        `### Standard Deduction`,
        `| | TY${fromYear} | TY${toYear} | Change |`,
        `|---|---|---|---|`,
        `| Single | $${fmt(from.standardDeduction.single)} | $${fmt(to.standardDeduction.single)} | +$${fmt(to.standardDeduction.single - from.standardDeduction.single)} |`,
        `| MFJ | $${fmt(from.standardDeduction.married_filing_jointly)} | $${fmt(to.standardDeduction.married_filing_jointly)} | +$${fmt(to.standardDeduction.married_filing_jointly - from.standardDeduction.married_filing_jointly)} |`,
        `| HoH | $${fmt(from.standardDeduction.head_of_household)} | $${fmt(to.standardDeduction.head_of_household)} | +$${fmt(to.standardDeduction.head_of_household - from.standardDeduction.head_of_household)} |`,
        "",
        `### Tax Brackets (${status.replace(/_/g, " ")})`,
        `| Rate | TY${fromYear} Starts At | TY${toYear} Starts At |`,
        `|------|---|---|`,
        ...from.brackets[status].map((b, i) => {
          const toB = to.brackets[status][i];
          return `| ${(b.rate * 100).toFixed(0)}% | $${fmt(b.min)} | $${fmt(toB.min)} |`;
        }),
        "",
        `### Child Tax Credit`,
        `| | TY${fromYear} | TY${toYear} |`,
        `|---|---|---|`,
        `| Per child | $${fmt(from.childTaxCredit.amount)} | $${fmt(to.childTaxCredit.amount)} |`,
        "",
        `### SALT Deduction Cap`,
        `| | TY${fromYear} | TY${toYear} |`,
        `|---|---|---|`,
        `| Base cap | $${fmt(from.saltCap.base)} | $${fmt(to.saltCap.base)} |`,
        `| MFS cap | $${fmt(from.saltCap.enhancedMfsCap ?? from.saltCap.mfs)} | $${fmt(to.saltCap.enhancedMfsCap ?? to.saltCap.mfs)} |`,
        to.saltCap.enhancedCap ? `| Enhanced cap (AGI ≤ $${fmt(to.saltCap.enhancedAgiThreshold!)}) | N/A | $${fmt(to.saltCap.enhancedCap)} |` : "",
        "",
        `### Social Security`,
        `| | TY${fromYear} | TY${toYear} |`,
        `|---|---|---|`,
        `| Wage base | $${fmt(from.socialSecurity.wageBase)} | $${fmt(to.socialSecurity.wageBase)} |`,
        "",
        `### AMT Exemption`,
        `| | TY${fromYear} | TY${toYear} |`,
        `|---|---|---|`,
        `| Single | $${fmt(from.amt.exemption.single)} | $${fmt(to.amt.exemption.single)} |`,
        `| MFJ | $${fmt(from.amt.exemption.married_filing_jointly)} | $${fmt(to.amt.exemption.married_filing_jointly)} |`,
      ];

      // OBBB new provisions
      if (to.obbbDeductions && !from.obbbDeductions) {
        const o = to.obbbDeductions;
        lines.push(
          "",
          `### OBBB Schedule 1-A Amounts (TY2025 through TY2028)`,
          "",
          `| New Deduction | Max Amount | AGI Limit | Expires |`,
          `|---------------|-----------|-----------|---------|`,
          `| Senior Bonus (65+) | $${fmt(o.seniorBonus.amount)}/person | $${fmt(o.seniorBonus.phaseoutSingle)} single / $${fmt(o.seniorBonus.phaseoutMFJ)} MFJ | 2028 |`,
          `| Tips Income | $${fmt(o.tipsDeduction.max)} | $${fmt(o.tipsDeduction.agiLimitSingle)} single / $${fmt(o.tipsDeduction.agiLimitMFJ)} MFJ | 2028 |`,
          `| Overtime Pay | $${fmt(o.overtimeDeduction.maxSingle)} single / $${fmt(o.overtimeDeduction.maxMFJ)} MFJ | $${fmt(o.overtimeDeduction.agiLimitSingle)} single / $${fmt(o.overtimeDeduction.agiLimitMFJ)} MFJ | 2028 |`,
          `| Auto Loan Interest | $${fmt(o.autoLoanInterest.max)} | $${fmt(o.autoLoanInterest.agiLimitSingle)} single / $${fmt(o.autoLoanInterest.agiLimitMFJ)} MFJ | 2028 |`,
        );
      }

      const modelingLabel: Record<LawChangeModeling, string> = {
        calculated: "Calculated",
        reference: "Reference only",
        not_modeled: "Not modeled",
      };
      const lawChanges = getLawChangesEffectiveBetween(fromYear, toYear);
      for (let year = fromYear + 1; year <= toYear; year += 1) {
        const yearChanges = lawChanges.filter((change) => change.effectiveTaxYear === year);
        if (yearChanges.length === 0) continue;
        lines.push(
          "",
          `### Law Changes Effective TY${year}`,
          "",
          `| Change | Type | Rule | Citation | In this tool |`,
          `|--------|------|------|----------|--------------|`,
          ...yearChanges.map((change) =>
            `| ${change.title} | ${change.kind} | ${change.summary} | ${change.citation} | ${modelingLabel[change.modeling]} |`),
          "",
          ...[...new Map(yearChanges.flatMap((change) => change.sources).map((source) => [source.url, source])).values()]
            .map((source) => `- [${source.title}](${source.url})`),
        );
      }

      lines.push(
        "",
        `> Inflation-adjusted amounts: IRS Rev. Proc. 2023-34 (TY2024), Rev. Proc. 2024-40 (TY2025), Rev. Proc. 2025-32 and SSA (TY2026). Law changes are listed by the first tax year they apply.`,
      );

      return { content: [{ type: "text", text: lines.filter(Boolean).join("\n") }] };
    }
  );
}
