/**
 * MCP tools for One Big Beautiful Bill Act (OBBB) new deductions.
 * Effective TY2025-2028: tips, overtime, senior bonus, auto loan interest.
 */

import { z } from "zod";
import { fmt, FilingStatusEnum } from "./shared.js";
import { type McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getTaxYearData, SUPPORTED_TAX_YEARS, type FilingStatus } from "../data/tax-brackets.js";
import { ERRORS } from "./error-handler.js";



export function registerObbbTools(server: McpServer): void {

  server.tool(
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

      // Senior bonus
      const age = params.age ?? 0;
      const spouseAge = params.spouseAge ?? 0;
      const seniorCount = (age >= 65 ? 1 : 0) + (isMFJ && spouseAge >= 65 ? 1 : 0);
      if (seniorCount > 0) {
        const maxSenior = seniorCount * obbb.seniorBonus.amount;
        if (isMFS) {
          deductions.push({
            name: "Senior Bonus Deduction (65+)",
            amount: 0,
            max: maxSenior,
            eligible: false,
            reason: "Married taxpayers must file jointly",
          });
        } else {
          const phaseout = isMFJ ? obbb.seniorBonus.phaseoutMFJ : obbb.seniorBonus.phaseoutSingle;
          const reduction = Math.round(
            Math.max(0, params.agi - phaseout) * 0.06 * seniorCount,
          );
          const seniorAmount = Math.max(0, maxSenior - reduction);
          deductions.push({
            name: "Senior Bonus Deduction (65+)",
            amount: seniorAmount,
            max: maxSenior,
            eligible: seniorAmount > 0,
            reason: seniorAmount === 0 ? "Fully phased out by MAGI" : undefined,
          });
        }
      } else if (age > 0) {
        deductions.push({ name: "Senior Bonus Deduction (65+)", amount: 0, max: obbb.seniorBonus.amount, eligible: false, reason: "Must be age 65 or older" });
      }

      // Tips deduction
      const tips = params.tipIncome ?? 0;
      if (tips > 0) {
        const tipsLimit = isMFJ ? obbb.tipsDeduction.agiLimitMFJ : obbb.tipsDeduction.agiLimitSingle;
        const tipsBase = Math.min(tips, obbb.tipsDeduction.max);
        if (isMFS) {
          deductions.push({
            name: "Tips Income Deduction",
            amount: 0,
            max: obbb.tipsDeduction.max,
            eligible: false,
            reason: "Married taxpayers must file jointly",
          });
        } else {
          const reduction = Math.round(Math.max(0, params.agi - tipsLimit) * 0.1);
          const tipsDeduction = Math.max(0, tipsBase - reduction);
          deductions.push({
            name: "Tips Income Deduction",
            amount: tipsDeduction,
            max: obbb.tipsDeduction.max,
            eligible: tipsDeduction > 0,
            reason: tipsDeduction === 0 ? "Fully phased out by MAGI" : undefined,
          });
        }
      }

      // Overtime deduction
      const overtime = params.overtimePay ?? 0;
      if (overtime > 0) {
        const overtimeLimit = isMFJ ? obbb.overtimeDeduction.agiLimitMFJ : obbb.overtimeDeduction.agiLimitSingle;
        const overtimeMax = isMFJ ? obbb.overtimeDeduction.maxMFJ : obbb.overtimeDeduction.maxSingle;
        const overtimeBase = Math.min(overtime, overtimeMax);
        if (isMFS) {
          deductions.push({
            name: "Overtime Pay Deduction",
            amount: 0,
            max: overtimeMax,
            eligible: false,
            reason: "Married taxpayers must file jointly",
          });
        } else {
          const reduction = Math.round(Math.max(0, params.agi - overtimeLimit) * 0.1);
          const overtimeDeduction = Math.max(0, overtimeBase - reduction);
          deductions.push({
            name: "Overtime Pay Deduction",
            amount: overtimeDeduction,
            max: overtimeMax,
            eligible: overtimeDeduction > 0,
            reason: overtimeDeduction === 0 ? "Fully phased out by MAGI" : undefined,
          });
        }
      }

      // Auto loan interest
      const autoInterest = params.autoLoanInterest ?? 0;
      if (autoInterest > 0) {
        const autoLimit = isMFJ ? obbb.autoLoanInterest.agiLimitMFJ : obbb.autoLoanInterest.agiLimitSingle;
        const autoBase = Math.min(autoInterest, obbb.autoLoanInterest.max);
        const reduction = params.agi > autoLimit
          ? Math.ceil((params.agi - autoLimit) / 1000) * 200
          : 0;
        const autoDeduction = Math.max(0, autoBase - reduction);
        deductions.push({
          name: "Auto Loan Interest Deduction",
          amount: autoDeduction,
          max: obbb.autoLoanInterest.max,
          eligible: autoDeduction > 0,
          reason: autoDeduction === 0 ? "Fully phased out by MAGI" : undefined,
        });
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

  server.tool(
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
          `### 🆕 New in TY${toYear} (One Big Beautiful Bill Act)`,
          "",
          `| New Deduction | Max Amount | AGI Limit | Expires |`,
          `|---------------|-----------|-----------|---------|`,
          `| Senior Bonus (65+) | $${fmt(o.seniorBonus.amount)}/person | $${fmt(o.seniorBonus.phaseoutSingle)} single / $${fmt(o.seniorBonus.phaseoutMFJ)} MFJ | 2028 |`,
          `| Tips Income | $${fmt(o.tipsDeduction.max)} | $${fmt(o.tipsDeduction.agiLimitSingle)} single / $${fmt(o.tipsDeduction.agiLimitMFJ)} MFJ | 2028 |`,
          `| Overtime Pay | $${fmt(o.overtimeDeduction.maxSingle)} single / $${fmt(o.overtimeDeduction.maxMFJ)} MFJ | $${fmt(o.overtimeDeduction.agiLimitSingle)} single / $${fmt(o.overtimeDeduction.agiLimitMFJ)} MFJ | 2028 |`,
          `| Auto Loan Interest | $${fmt(o.autoLoanInterest.max)} | $${fmt(o.autoLoanInterest.agiLimitSingle)} single / $${fmt(o.autoLoanInterest.agiLimitMFJ)} MFJ | 2028 |`,
        );
      }

      lines.push(
        "",
        `> Source: IRS Rev. Proc. 2023-34 (TY2024), Rev. Proc. 2024-40 plus OBBB (TY2025), Rev. Proc. 2025-32 plus SSA data (TY2026)`,
      );

      return { content: [{ type: "text", text: lines.filter(Boolean).join("\n") }] };
    }
  );
}
