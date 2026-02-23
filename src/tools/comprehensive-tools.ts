/**
 * MCP tools for full tax reports, 1099 income processing,
 * personalized tax calendar, and paycheck analysis.
 */

import { z } from "zod";
import { fmt, FilingStatusEnum } from "./shared.js";
import { type McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { calculateTax } from "../calculators/tax-calculator.js";
import { calculateStateTax } from "../calculators/state-tax-calculator.js";
import { calculateEITC } from "../calculators/eitc-calculator.js";
import { getTaxYearData, getSaltCap } from "../data/tax-brackets.js";



export function registerComprehensiveTools(server: McpServer): void {

  // --- Tool 1: Full Tax Report ---
  server.tool(
    "generate_full_tax_report",
    "Generate a full tax estimate report combining federal tax, state tax, FICA, " +
    "all credits and deductions into one summary. Like a TurboTax final page.",
    {
      taxYear: z.number().describe("Tax year (2024 or 2025)"),
      filingStatus: FilingStatusEnum,
      // Income
      w2Income: z.number().min(0).optional().describe("W-2 wages"),
      selfEmploymentIncome: z.number().min(0).optional().describe("Self-employment net profit"),
      interestIncome: z.number().min(0).optional().describe("1099-INT interest income"),
      dividendIncome: z.number().min(0).optional().describe("1099-DIV ordinary dividends"),
      qualifiedDividends: z.number().min(0).optional().describe("Qualified dividends (subset of dividends, taxed at CG rates)"),
      longTermCapitalGains: z.number().optional().describe("Long-term capital gains/losses"),
      shortTermCapitalGains: z.number().optional().describe("Short-term capital gains/losses"),
      otherIncome: z.number().optional().describe("Other income (rental, alimony, etc.)"),
      // Deductions
      aboveTheLineDeductions: z.number().min(0).optional().describe("HSA, student loan interest, educator expenses, etc."),
      mortgageInterest: z.number().min(0).optional().describe("Mortgage interest"),
      stateLocalTaxesPaid: z.number().min(0).optional().describe("State/local/property taxes paid"),
      charitableDonations: z.number().min(0).optional().describe("Charitable contributions"),
      medicalExpenses: z.number().min(0).optional().describe("Unreimbursed medical expenses"),
      otherItemized: z.number().min(0).optional().describe("Other itemized deductions"),
      // Credits & dependents
      dependents: z.number().int().min(0).optional().describe("Qualifying children under 17"),
      qualifiedBusinessIncome: z.number().min(0).optional().describe("QBI for Section 199A"),
      // State
      stateCode: z.string().length(2).optional().describe("State code for state tax estimate"),
      // Withholding
      federalWithheld: z.number().min(0).optional().describe("Federal tax already withheld YTD"),
      stateWithheld: z.number().min(0).optional().describe("State tax already withheld YTD"),
      estimatedPaymentsMade: z.number().min(0).optional().describe("Estimated tax payments already made"),
    },
    async (params) => {
      const taxData = getTaxYearData(params.taxYear);
      if (!taxData) {
        return { content: [{ type: "text", text: `Tax year ${params.taxYear} not supported.` }], isError: true };
      }

      // Aggregate income
      const w2 = params.w2Income ?? 0;
      const se = params.selfEmploymentIncome ?? 0;
      const interest = params.interestIncome ?? 0;
      const dividends = params.dividendIncome ?? 0;
      const qualDiv = params.qualifiedDividends ?? 0;
      const ltcg = params.longTermCapitalGains ?? 0;
      const stcg = params.shortTermCapitalGains ?? 0;
      const other = params.otherIncome ?? 0;
      const grossIncome = w2 + se + interest + dividends + ltcg + stcg + other;

      if (grossIncome <= 0) {
        return { content: [{ type: "text", text: "Gross income must be greater than zero to generate a tax report." }], isError: true };
      }

      // Itemized deductions
      const mortgage = params.mortgageInterest ?? 0;
      const saltPaid = params.stateLocalTaxesPaid ?? 0;
      const saltCap = getSaltCap(params.taxYear, params.filingStatus, grossIncome);
      const saltDeductible = Math.min(saltPaid, saltCap);
      const charity = params.charitableDonations ?? 0;
      const medical = Math.max(0, (params.medicalExpenses ?? 0) - grossIncome * 0.075);
      const otherItemized = params.otherItemized ?? 0;
      const totalItemized = mortgage + saltDeductible + charity + medical + otherItemized;

      // Federal tax
      const federalResult = calculateTax({
        taxYear: params.taxYear,
        filingStatus: params.filingStatus,
        grossIncome,
        w2Income: w2,
        selfEmploymentIncome: se,
        capitalGains: ltcg > 0 ? ltcg : undefined,
        capitalGainsLongTerm: true,
        shortTermCapitalGains: stcg > 0 ? stcg : undefined,
        aboveTheLineDeductions: params.aboveTheLineDeductions,
        itemizedDeductions: totalItemized > 0 ? totalItemized : undefined,
        dependents: params.dependents,
        qualifiedBusinessIncome: params.qualifiedBusinessIncome,
      });

      // FICA (employee share only for W-2; SE tax already in federal calc)
      const ssWages = Math.min(w2, taxData.socialSecurity.wageBase);
      const ficaSS = ssWages * taxData.socialSecurity.taxRate;
      const ficaMedicare = w2 * taxData.medicare.taxRate;
      const ficaTotal = ficaSS + ficaMedicare;

      // EITC check
      const earnedIncome = w2 + se;
      const eitcResult = calculateEITC({
        taxYear: params.taxYear,
        filingStatus: params.filingStatus,
        earnedIncome,
        agi: federalResult.adjustedGrossIncome,
        qualifyingChildren: params.dependents ?? 0,
        investmentIncome: interest + dividends + Math.max(0, ltcg) + Math.max(0, stcg),
      });

      // State tax
      let stateTax = 0;
      let stateName = "N/A";
      if (params.stateCode) {
        const stateFilingStatus = params.filingStatus === "married_filing_jointly" ? "married" as const : "single" as const;
        const stateResult = calculateStateTax({
          stateCode: params.stateCode,
          taxableIncome: federalResult.adjustedGrossIncome,
          filingStatus: stateFilingStatus,
        });
        if (stateResult) {
          stateTax = stateResult.tax;
          stateName = stateResult.stateName;
        }
      }

      // Totals
      const totalFederal = federalResult.totalFederalTax - (eitcResult.eligible ? eitcResult.credit : 0);
      const totalAllTaxes = Math.max(0, totalFederal) + ficaTotal + stateTax;
      const takeHome = grossIncome - totalAllTaxes;

      // Withholding / refund
      const withheld = (params.federalWithheld ?? 0) + (params.estimatedPaymentsMade ?? 0);
      const stateWithheld = params.stateWithheld ?? 0;
      const federalOwed = Math.max(0, totalFederal) - withheld;
      const stateOwed = stateTax - stateWithheld;

      const lines = [
        `# 📋 Full Tax Report — TY${params.taxYear}`,
        `**${params.filingStatus.replace(/_/g, " ")}**${params.stateCode ? ` | **${stateName}**` : ""}`,
        "",
        `## 1. Income Summary`,
        `| Source | Amount |`,
        `|--------|--------|`,
        w2 > 0 ? `| W-2 Wages | $${fmt(w2)} |` : "",
        se > 0 ? `| Self-Employment | $${fmt(se)} |` : "",
        interest > 0 ? `| Interest (1099-INT) | $${fmt(interest)} |` : "",
        dividends > 0 ? `| Dividends (1099-DIV) | $${fmt(dividends)} |` : "",
        qualDiv > 0 ? `| ↳ Qualified Dividends | $${fmt(qualDiv)} |` : "",
        ltcg !== 0 ? `| Long-Term Capital Gains | $${fmt(ltcg)} |` : "",
        stcg !== 0 ? `| Short-Term Capital Gains | $${fmt(stcg)} |` : "",
        other !== 0 ? `| Other Income | $${fmt(other)} |` : "",
        `| **Gross Income** | **$${fmt(grossIncome)}** |`,
        `| Adjusted Gross Income | $${fmt(federalResult.adjustedGrossIncome)} |`,
        "",
        `## 2. Deductions`,
        `| Item | Amount |`,
        `|------|--------|`,
        `| Deduction Type | ${federalResult.deductionType} |`,
        `| Deduction Amount | $${fmt(federalResult.deductionAmount)} |`,
        totalItemized > 0 ? `| ↳ Mortgage Interest | $${fmt(mortgage)} |` : "",
        saltDeductible > 0 ? `| ↳ SALT (capped at $${fmt(saltCap)}) | $${fmt(saltDeductible)} |` : "",
        charity > 0 ? `| ↳ Charitable | $${fmt(charity)} |` : "",
        medical > 0 ? `| ↳ Medical (above 7.5% AGI) | $${fmt(medical)} |` : "",
        federalResult.qbiDeduction > 0 ? `| QBI Deduction (§199A) | $${fmt(federalResult.qbiDeduction)} |` : "",
        `| **Taxable Income** | **$${fmt(federalResult.taxableIncome)}** |`,
        "",
        `## 3. Federal Tax`,
        `| Component | Amount |`,
        `|-----------|--------|`,
        `| Income Tax | $${fmt(federalResult.ordinaryIncomeTax)} |`,
        federalResult.capitalGainsTax > 0 ? `| Capital Gains Tax | $${fmt(federalResult.capitalGainsTax)} |` : "",
        federalResult.selfEmploymentTax > 0 ? `| Self-Employment Tax | $${fmt(federalResult.selfEmploymentTax)} |` : "",
        federalResult.niit > 0 ? `| NIIT (3.8%) | $${fmt(federalResult.niit)} |` : "",
        federalResult.additionalMedicareTax > 0 ? `| Additional Medicare (0.9%) | $${fmt(federalResult.additionalMedicareTax)} |` : "",
        federalResult.amt > 0 ? `| AMT | $${fmt(federalResult.amt)} |` : "",
        federalResult.childTaxCredit > 0 ? `| Child Tax Credit | -$${fmt(federalResult.childTaxCredit)} |` : "",
        eitcResult.eligible ? `| EITC | -$${fmt(eitcResult.credit)} |` : "",
        `| **Federal Tax** | **$${fmt(Math.max(0, totalFederal))}** |`,
        `| Effective Federal Rate | ${(Math.max(0, totalFederal) / grossIncome * 100).toFixed(2)}% |`,
        `| Marginal Rate | ${(federalResult.marginalRate * 100).toFixed(0)}% |`,
        "",
        `## 4. FICA (Employee Share)`,
        `| Component | Amount |`,
        `|-----------|--------|`,
        `| Social Security (6.2%) | $${fmt(Math.round(ficaSS))} |`,
        `| Medicare (1.45%) | $${fmt(Math.round(ficaMedicare))} |`,
        `| **FICA Total** | **$${fmt(Math.round(ficaTotal))}** |`,
      ];

      if (params.stateCode) {
        lines.push(
          "",
          `## 5. State Tax — ${stateName}`,
          `| Item | Amount |`,
          `|------|--------|`,
          `| State Tax | $${fmt(stateTax)} |`,
          `| Effective State Rate | ${(stateTax / grossIncome * 100).toFixed(2)}% |`,
        );
      }

      lines.push(
        "",
        `## ${params.stateCode ? "6" : "5"}. Total Tax Burden`,
        `| Component | Amount | Rate |`,
        `|-----------|--------|------|`,
        `| Federal Tax | $${fmt(Math.max(0, totalFederal))} | ${(Math.max(0, totalFederal) / grossIncome * 100).toFixed(2)}% |`,
        `| FICA | $${fmt(Math.round(ficaTotal))} | ${(ficaTotal / grossIncome * 100).toFixed(2)}% |`,
        params.stateCode ? `| State Tax | $${fmt(stateTax)} | ${(stateTax / grossIncome * 100).toFixed(2)}% |` : "",
        `| **Total Taxes** | **$${fmt(Math.round(totalAllTaxes))}** | **${(totalAllTaxes / grossIncome * 100).toFixed(2)}%** |`,
        "",
        `| | Amount |`,
        `|---|---|`,
        `| Gross Income | $${fmt(grossIncome)} |`,
        `| Total Taxes | -$${fmt(Math.round(totalAllTaxes))} |`,
        `| **Take-Home** | **$${fmt(Math.round(takeHome))}** |`,
        `| Monthly Take-Home | $${fmt(Math.round(takeHome / 12))} |`,
        `| Biweekly Take-Home | $${fmt(Math.round(takeHome / 26))} |`,
      );

      // Refund / owed section
      if (withheld > 0 || stateWithheld > 0) {
        lines.push(
          "",
          `## ${params.stateCode ? "7" : "6"}. Refund / Amount Owed`,
          `| Item | Amount |`,
          `|------|--------|`,
          `| Federal Tax Owed | $${fmt(Math.max(0, totalFederal))} |`,
          `| Federal Withheld + Estimated | -$${fmt(withheld)} |`,
          federalOwed > 0 ? `| **Federal Balance Due** | **$${fmt(Math.round(federalOwed))}** |` : `| **Federal Refund** | **$${fmt(Math.round(Math.abs(federalOwed)))}** 🎉 |`,
        );
        if (params.stateCode) {
          lines.push(
            `| State Tax Owed | $${fmt(stateTax)} |`,
            `| State Withheld | -$${fmt(stateWithheld)} |`,
            stateOwed > 0 ? `| **State Balance Due** | **$${fmt(Math.round(stateOwed))}** |` : `| **State Refund** | **$${fmt(Math.round(Math.abs(stateOwed)))}** 🎉 |`,
          );
        }
      }

      lines.push(
        "",
        `> ⚠️ This is an estimate for educational purposes only. Actual tax liability may differ. Consult a qualified tax professional.`,
      );

      return { content: [{ type: "text", text: lines.filter(Boolean).join("\n") }] };
    }
  );

  // --- Tool 2: 1099 Income Processor ---
  server.tool(
    "process_1099_income",
    "Process multiple 1099 forms and calculate the tax impact of each income type. " +
    "Handles 1099-NEC (freelance), 1099-INT (interest), 1099-DIV (dividends), 1099-B (investments), 1099-MISC.",
    {
      taxYear: z.number().describe("Tax year"),
      filingStatus: FilingStatusEnum,
      w2Income: z.number().min(0).optional().describe("W-2 income (for context)"),
      forms: z.array(z.object({
        type: z.enum(["1099-NEC", "1099-INT", "1099-DIV", "1099-B", "1099-MISC"]),
        payer: z.string().optional().describe("Payer name"),
        amount: z.number().describe("Total amount"),
        qualifiedDividends: z.number().optional().describe("For 1099-DIV: qualified dividends"),
        longTerm: z.boolean().optional().describe("For 1099-B: long-term gains"),
      })).describe("Array of 1099 forms"),
    },
    async ({ taxYear, filingStatus, w2Income, forms }) => {
      const w2 = w2Income ?? 0;
      let necTotal = 0;
      let intTotal = 0;
      let divTotal = 0;
      let qualDivTotal = 0;
      let ltcgTotal = 0;
      let stcgTotal = 0;
      let miscTotal = 0;

      const formLines: string[] = [];
      for (const f of forms) {
        const payer = f.payer ?? "Unknown";
        formLines.push(`| ${f.type} | ${payer} | $${fmt(f.amount)} |`);
        switch (f.type) {
          case "1099-NEC": necTotal += f.amount; break;
          case "1099-INT": intTotal += f.amount; break;
          case "1099-DIV":
            divTotal += f.amount;
            qualDivTotal += f.qualifiedDividends ?? 0;
            break;
          case "1099-B":
            if (f.longTerm !== false) ltcgTotal += f.amount;
            else stcgTotal += f.amount;
            break;
          case "1099-MISC": miscTotal += f.amount; break;
        }
      }

      const grossIncome = w2 + necTotal + intTotal + divTotal + ltcgTotal + stcgTotal + miscTotal;

      const result = calculateTax({
        taxYear,
        filingStatus,
        grossIncome,
        w2Income: w2,
        selfEmploymentIncome: necTotal,
        capitalGains: ltcgTotal > 0 ? ltcgTotal : undefined,
        capitalGainsLongTerm: true,
        shortTermCapitalGains: stcgTotal > 0 ? stcgTotal : undefined,
        qualifiedBusinessIncome: necTotal > 0 ? necTotal : undefined,
      });

      const lines = [
        `## 1099 Income Summary — TY${taxYear}`,
        "",
        `### Forms Received`,
        `| Form | Payer | Amount |`,
        `|------|-------|--------|`,
        ...formLines,
        "",
        `### Income by Category`,
        `| Category | Amount | Tax Treatment |`,
        `|----------|--------|---------------|`,
        w2 > 0 ? `| W-2 Wages | $${fmt(w2)} | Ordinary income, FICA withheld |` : "",
        necTotal > 0 ? `| 1099-NEC (Self-Employment) | $${fmt(necTotal)} | Ordinary income + SE tax (15.3%) |` : "",
        intTotal > 0 ? `| 1099-INT (Interest) | $${fmt(intTotal)} | Ordinary income |` : "",
        divTotal > 0 ? `| 1099-DIV (Dividends) | $${fmt(divTotal)} | Ordinary income |` : "",
        qualDivTotal > 0 ? `| ↳ Qualified Dividends | $${fmt(qualDivTotal)} | Taxed at capital gains rates |` : "",
        ltcgTotal > 0 ? `| 1099-B (Long-Term Gains) | $${fmt(ltcgTotal)} | 0%/15%/20% capital gains rates |` : "",
        stcgTotal > 0 ? `| 1099-B (Short-Term Gains) | $${fmt(stcgTotal)} | Ordinary income rates |` : "",
        ltcgTotal < 0 ? `| 1099-B (Capital Losses) | $${fmt(ltcgTotal)} | Offset gains, then $3K/yr ordinary |` : "",
        miscTotal > 0 ? `| 1099-MISC | $${fmt(miscTotal)} | Ordinary income |` : "",
        `| **Total Income** | **$${fmt(grossIncome)}** | |`,
        "",
        `### Tax Impact`,
        `| Item | Amount |`,
        `|------|--------|`,
        `| Federal Tax | $${fmt(result.totalFederalTax)} |`,
        result.selfEmploymentTax > 0 ? `| ↳ Self-Employment Tax | $${fmt(result.selfEmploymentTax)} |` : "",
        result.capitalGainsTax > 0 ? `| ↳ Capital Gains Tax | $${fmt(result.capitalGainsTax)} |` : "",
        result.niit > 0 ? `| ↳ NIIT (3.8%) | $${fmt(result.niit)} |` : "",
        `| Effective Rate | ${(result.effectiveRate * 100).toFixed(2)}% |`,
        "",
      ];

      // SE tax reminder
      if (necTotal > 0) {
        const quarterlyEstimate = Math.ceil(result.totalFederalTax / 4);
        lines.push(
          `### ⚠️ Self-Employment Reminders`,
          `- 1099-NEC income is subject to SE tax (${(necTotal * 0.9235 * 0.153).toFixed(0)} estimated)`,
          `- You should make quarterly estimated payments: ~$${fmt(quarterlyEstimate)}/quarter`,
          `- Deductible: 50% of SE tax, QBI deduction (20%), health insurance premiums`,
          "",
        );
      }

      lines.push(`> ⚠️ Estimate only. Does not account for all possible deductions and credits.`);

      return { content: [{ type: "text", text: lines.filter(Boolean).join("\n") }] };
    }
  );

  // --- Tool 3: Personalized Tax Calendar ---
  server.tool(
    "get_personalized_tax_calendar",
    "Generate a personalized tax calendar based on your situation. " +
    "Shows deadlines for filing, estimated payments, extensions, and key actions.",
    {
      taxYear: z.number().describe("Tax year to get calendar for"),
      isSelfEmployed: z.boolean().optional().describe("Do you have self-employment income?"),
      filedExtension: z.boolean().optional().describe("Did you file an extension?"),
      hasEmployer: z.boolean().optional().describe("Do you have W-2 employment?"),
      hasInvestments: z.boolean().optional().describe("Do you have investment accounts?"),
      hasRentalIncome: z.boolean().optional().describe("Do you have rental property income?"),
    },
    async (params) => {
      const y = params.taxYear;
      const fy = y + 1; // filing year

      interface CalendarItem {
        date: string;
        action: string;
        applies: boolean;
        priority: "🔴" | "🟡" | "🟢";
      }

      const items: CalendarItem[] = [
        { date: `${fy}-01-15`, action: `Q4 ${y} estimated tax payment due`, applies: params.isSelfEmployed ?? false, priority: "🔴" },
        { date: `${fy}-01-31`, action: "Employers must send W-2 forms", applies: params.hasEmployer ?? true, priority: "🟡" },
        { date: `${fy}-01-31`, action: "Brokerages/banks must send 1099 forms", applies: params.hasInvestments ?? false, priority: "🟡" },
        { date: `${fy}-02-15`, action: "Corrected 1099s may arrive — wait before filing if expected", applies: params.hasInvestments ?? false, priority: "🟢" },
        { date: `${fy}-02-18`, action: "EITC/ACTC refunds begin processing (if filed early)", applies: true, priority: "🟢" },
        { date: `${fy}-03-15`, action: "S-Corp and Partnership returns due (Form 1120-S, 1065)", applies: false, priority: "🟡" },
        { date: `${fy}-04-15`, action: `Individual tax return due (Form 1040) for TY${y}`, applies: true, priority: "🔴" },
        { date: `${fy}-04-15`, action: `Q1 ${fy} estimated tax payment due`, applies: params.isSelfEmployed ?? false, priority: "🔴" },
        { date: `${fy}-04-15`, action: "Last day to file extension (Form 4868) — extends filing to Oct 15", applies: true, priority: "🟡" },
        { date: `${fy}-04-15`, action: `Last day to make TY${y} IRA/HSA contributions`, applies: true, priority: "🟡" },
        { date: `${fy}-06-16`, action: `Q2 ${fy} estimated tax payment due`, applies: params.isSelfEmployed ?? false, priority: "🔴" },
        { date: `${fy}-09-15`, action: `Q3 ${fy} estimated tax payment due`, applies: params.isSelfEmployed ?? false, priority: "🔴" },
        { date: `${fy}-10-15`, action: "Extended filing deadline (if extension filed)", applies: params.filedExtension ?? false, priority: "🔴" },
      ];

      const relevant = items.filter((i) => i.applies);
      const today = new Date().toISOString().split("T")[0];

      const lines = [
        `## 📅 Your Tax Calendar — TY${y}`,
        "",
        `| Date | Priority | Action | Status |`,
        `|------|----------|--------|--------|`,
        ...relevant.map((i) => {
          const status = i.date < today ? "✅ Past" : "⏳ Upcoming";
          return `| ${i.date} | ${i.priority} | ${i.action} | ${status} |`;
        }),
        "",
      ];

      // Personalized tips
      const tips: string[] = [];
      if (params.isSelfEmployed) {
        tips.push("💡 As self-employed, you must make quarterly estimated payments to avoid underpayment penalties.");
      }
      if (params.filedExtension) {
        tips.push("💡 Extension extends your filing deadline to Oct 15, but does NOT extend the payment deadline (still Apr 15).");
      }
      if (params.hasInvestments) {
        tips.push("💡 Wait until mid-February for corrected 1099s before filing. Brokerages often issue corrections.");
      }
      if (params.hasRentalIncome) {
        tips.push("💡 Rental income is reported on Schedule E. Keep records of all expenses for deductions.");
      }

      if (tips.length > 0) {
        lines.push("### Tips for Your Situation", "", ...tips, "");
      }

      return { content: [{ type: "text", text: lines.join("\n") }] };
    }
  );

  // --- Tool 4: Paycheck Analyzer ---
  server.tool(
    "analyze_paycheck",
    "Analyze a paycheck to verify withholding accuracy. " +
    "Input your pay stub numbers and see if your employer is withholding the right amount.",
    {
      taxYear: z.number().describe("Tax year"),
      filingStatus: FilingStatusEnum,
      payFrequency: z.enum(["weekly", "biweekly", "semimonthly", "monthly"]),
      grossPay: z.number().min(0).describe("Gross pay this period"),
      federalWithheld: z.number().min(0).describe("Federal tax withheld this period"),
      stateWithheld: z.number().min(0).optional().describe("State tax withheld this period"),
      socialSecurityWithheld: z.number().min(0).optional().describe("Social Security withheld"),
      medicareWithheld: z.number().min(0).optional().describe("Medicare withheld"),
      retirement401k: z.number().min(0).optional().describe("401k/403b pre-tax contribution this period"),
      hsaContribution: z.number().min(0).optional().describe("HSA contribution this period"),
      stateCode: z.string().length(2).optional(),
    },
    async (params) => {
      const periods: Record<string, number> = { weekly: 52, biweekly: 26, semimonthly: 24, monthly: 12 };
      const periodsPerYear = periods[params.payFrequency];
      const annualGross = params.grossPay * periodsPerYear;
      const annual401k = (params.retirement401k ?? 0) * periodsPerYear;
      const annualHSA = (params.hsaContribution ?? 0) * periodsPerYear;
      const annualTaxableIncome = annualGross - annual401k - annualHSA;

      // Expected federal tax
      const expected = calculateTax({
        taxYear: params.taxYear,
        filingStatus: params.filingStatus,
        grossIncome: annualTaxableIncome,
        w2Income: annualTaxableIncome,
      });

      const expectedPerPeriod = Math.round(expected.totalFederalTax / periodsPerYear);
      const actualFederal = params.federalWithheld;
      const federalDiff = actualFederal - expectedPerPeriod;

      // Expected FICA
      const expectedSS = Math.round(Math.min(annualGross, 168600) * 0.062 / periodsPerYear);
      const expectedMedicare = Math.round(annualGross * 0.0145 / periodsPerYear);
      const actualSS = params.socialSecurityWithheld ?? 0;
      const actualMedicare = params.medicareWithheld ?? 0;

      const lines = [
        `## 💰 Paycheck Analysis — TY${params.taxYear}`,
        `**${params.payFrequency}** pay (${periodsPerYear} periods/year) | **${params.filingStatus.replace(/_/g, " ")}**`,
        "",
        `### This Paycheck`,
        `| Item | Actual | Expected | Diff |`,
        `|------|--------|----------|------|`,
        `| Gross Pay | $${fmt(params.grossPay)} | — | — |`,
        `| Federal Tax | $${fmt(actualFederal)} | ~$${fmt(expectedPerPeriod)} | ${federalDiff >= 0 ? "+" : ""}$${fmt(federalDiff)} |`,
        actualSS > 0 ? `| Social Security | $${fmt(actualSS)} | ~$${fmt(expectedSS)} | ${actualSS - expectedSS >= 0 ? "+" : ""}$${fmt(actualSS - expectedSS)} |` : "",
        actualMedicare > 0 ? `| Medicare | $${fmt(actualMedicare)} | ~$${fmt(expectedMedicare)} | ${actualMedicare - expectedMedicare >= 0 ? "+" : ""}$${fmt(actualMedicare - expectedMedicare)} |` : "",
        params.stateWithheld ? `| State Tax | $${fmt(params.stateWithheld)} | — | — |` : "",
        params.retirement401k ? `| 401k/403b | $${fmt(params.retirement401k)} | — | pre-tax |` : "",
        params.hsaContribution ? `| HSA | $${fmt(params.hsaContribution)} | — | pre-tax |` : "",
        "",
        `### Annual Projection`,
        `| Item | Amount |`,
        `|------|--------|`,
        `| Annual Gross | $${fmt(annualGross)} |`,
        annual401k > 0 ? `| 401k Contributions | -$${fmt(annual401k)} |` : "",
        annualHSA > 0 ? `| HSA Contributions | -$${fmt(annualHSA)} |` : "",
        `| Taxable Income | $${fmt(annualTaxableIncome)} |`,
        `| Expected Annual Federal Tax | $${fmt(expected.totalFederalTax)} |`,
        `| Annual Federal Withheld (projected) | $${fmt(actualFederal * periodsPerYear)} |`,
        "",
      ];

      const annualFederalWithheld = actualFederal * periodsPerYear;
      const annualDiff = annualFederalWithheld - expected.totalFederalTax;

      if (Math.abs(annualDiff) < 500) {
        lines.push("✅ **Withholding looks accurate.** You're within $500 of your expected tax.");
      } else if (annualDiff > 0) {
        lines.push(
          `⚠️ **Over-withholding by ~$${fmt(Math.round(annualDiff))}/year.** You'll likely get a refund.`,
          `Consider reducing W-4 withholding to keep ~$${fmt(Math.round(annualDiff / periodsPerYear))} more per paycheck.`,
        );
      } else {
        lines.push(
          `⚠️ **Under-withholding by ~$${fmt(Math.round(Math.abs(annualDiff)))}/year.** You may owe at tax time.`,
          `Consider increasing W-4 withholding by ~$${fmt(Math.round(Math.abs(annualDiff) / periodsPerYear))} per paycheck.`,
        );
      }

      lines.push("", `> ⚠️ Simplified estimate. Actual withholding depends on W-4 settings, pre-tax benefits, and other factors.`);

      return { content: [{ type: "text", text: lines.filter(Boolean).join("\n") }] };
    }
  );

  // --- Tool 5: Tax Scenario Simulator ---
  server.tool(
    "simulate_tax_scenario",
    "What-if tax scenario simulator. Compare your current situation against a hypothetical change: " +
    "income change, relocation, Roth conversion, filing status change, etc. " +
    "Shows the exact tax impact of the change.",
    {
      taxYear: z.number().describe("Tax year"),
      filingStatus: FilingStatusEnum,
      // Current scenario
      currentIncome: z.number().min(0).describe("Current gross income"),
      currentState: z.string().length(2).optional().describe("Current state code"),
      currentSelfEmployment: z.number().min(0).optional(),
      currentCapitalGains: z.number().optional(),
      currentItemizedDeductions: z.number().min(0).optional(),
      currentDependents: z.number().int().min(0).optional(),
      // What-if changes (any combination)
      whatIfIncomeChange: z.number().optional().describe("Income change amount (positive = more income, negative = less)"),
      whatIfNewState: z.string().length(2).optional().describe("New state if relocating"),
      whatIfFilingStatus: FilingStatusEnum.optional().describe("New filing status"),
      whatIfRothConversion: z.number().min(0).optional().describe("Amount to convert from Traditional to Roth IRA"),
      whatIfAdditional401k: z.number().min(0).optional().describe("Additional 401k contribution"),
      whatIfNewDependents: z.number().int().min(0).optional().describe("New number of dependents"),
      whatIfItemizedChange: z.number().optional().describe("Change in itemized deductions"),
    },
    async (params) => {
      // --- Current scenario ---
      const currentFederal = calculateTax({
        taxYear: params.taxYear,
        filingStatus: params.filingStatus,
        grossIncome: params.currentIncome,
        selfEmploymentIncome: params.currentSelfEmployment,
        capitalGains: params.currentCapitalGains,
        capitalGainsLongTerm: true,
        itemizedDeductions: params.currentItemizedDeductions,
        dependents: params.currentDependents,
      });

      let currentStateTax = 0;
      let currentStateName = "N/A";
      if (params.currentState) {
        const sr = calculateStateTax({
          stateCode: params.currentState,
          taxableIncome: currentFederal.adjustedGrossIncome,
          filingStatus: params.filingStatus === "married_filing_jointly" ? "married" : "single",
        });
        if (sr) { currentStateTax = sr.tax; currentStateName = sr.stateName; }
      }
      const currentTotal = currentFederal.totalFederalTax + currentStateTax;

      // --- What-if scenario ---
      const newFilingStatus = params.whatIfFilingStatus ?? params.filingStatus;
      const newIncome = params.currentIncome
        + (params.whatIfIncomeChange ?? 0)
        + (params.whatIfRothConversion ?? 0);
      const newAboveTheLine = params.whatIfAdditional401k ?? 0;
      const newItemized = params.currentItemizedDeductions
        ? params.currentItemizedDeductions + (params.whatIfItemizedChange ?? 0)
        : params.whatIfItemizedChange && params.whatIfItemizedChange > 0
          ? params.whatIfItemizedChange
          : undefined;

      const whatIfFederal = calculateTax({
        taxYear: params.taxYear,
        filingStatus: newFilingStatus,
        grossIncome: newIncome,
        selfEmploymentIncome: params.currentSelfEmployment,
        capitalGains: params.currentCapitalGains,
        capitalGainsLongTerm: true,
        aboveTheLineDeductions: newAboveTheLine > 0 ? newAboveTheLine : undefined,
        itemizedDeductions: newItemized && newItemized > 0 ? newItemized : undefined,
        dependents: params.whatIfNewDependents ?? params.currentDependents,
      });

      const whatIfStateCode = params.whatIfNewState ?? params.currentState;
      let whatIfStateTax = 0;
      let whatIfStateName = "N/A";
      if (whatIfStateCode) {
        const sr = calculateStateTax({
          stateCode: whatIfStateCode,
          taxableIncome: whatIfFederal.adjustedGrossIncome,
          filingStatus: newFilingStatus === "married_filing_jointly" ? "married" : "single",
        });
        if (sr) { whatIfStateTax = sr.tax; whatIfStateName = sr.stateName; }
      }
      const whatIfTotal = whatIfFederal.totalFederalTax + whatIfStateTax;

      const totalDiff = whatIfTotal - currentTotal;
      const federalDiff = whatIfFederal.totalFederalTax - currentFederal.totalFederalTax;
      const stateDiff = whatIfStateTax - currentStateTax;

      // Describe the changes
      const changes: string[] = [];
      if (params.whatIfIncomeChange) changes.push(`Income ${params.whatIfIncomeChange > 0 ? "+" : ""}$${fmt(params.whatIfIncomeChange)}`);
      if (params.whatIfNewState) changes.push(`Relocate ${currentStateName} → ${whatIfStateName}`);
      if (params.whatIfFilingStatus) changes.push(`Filing: ${params.filingStatus.replace(/_/g, " ")} → ${newFilingStatus.replace(/_/g, " ")}`);
      if (params.whatIfRothConversion) changes.push(`Roth conversion: $${fmt(params.whatIfRothConversion)}`);
      if (params.whatIfAdditional401k) changes.push(`Additional 401k: $${fmt(params.whatIfAdditional401k)}`);
      if (params.whatIfNewDependents !== undefined) changes.push(`Dependents: ${params.currentDependents ?? 0} → ${params.whatIfNewDependents}`);
      if (params.whatIfItemizedChange) changes.push(`Itemized deductions ${params.whatIfItemizedChange > 0 ? "+" : ""}$${fmt(params.whatIfItemizedChange)}`);

      const lines = [
        `## 🔮 Tax Scenario Simulator — TY${params.taxYear}`,
        "",
        `### Changes Modeled`,
        ...changes.map((c) => `- ${c}`),
        "",
        `### Comparison`,
        `| | Current | What-If | Difference |`,
        `|---|---|---|---|`,
        `| Gross Income | $${fmt(params.currentIncome)} | $${fmt(newIncome)} | ${newIncome - params.currentIncome >= 0 ? "+" : ""}$${fmt(newIncome - params.currentIncome)} |`,
        `| Filing Status | ${params.filingStatus.replace(/_/g, " ")} | ${newFilingStatus.replace(/_/g, " ")} | ${params.whatIfFilingStatus ? "changed" : "—"} |`,
        `| Federal Tax | $${fmt(currentFederal.totalFederalTax)} | $${fmt(whatIfFederal.totalFederalTax)} | ${federalDiff >= 0 ? "+" : ""}$${fmt(federalDiff)} |`,
        `| Effective Federal Rate | ${(currentFederal.effectiveRate * 100).toFixed(2)}% | ${(whatIfFederal.effectiveRate * 100).toFixed(2)}% | ${((whatIfFederal.effectiveRate - currentFederal.effectiveRate) * 100).toFixed(2)}pp |`,
        `| Marginal Rate | ${(currentFederal.marginalRate * 100).toFixed(0)}% | ${(whatIfFederal.marginalRate * 100).toFixed(0)}% | — |`,
        params.currentState || params.whatIfNewState ? `| State Tax | $${fmt(currentStateTax)} (${currentStateName}) | $${fmt(whatIfStateTax)} (${whatIfStateName}) | ${stateDiff >= 0 ? "+" : ""}$${fmt(stateDiff)} |` : "",
        `| **Total Tax** | **$${fmt(currentTotal)}** | **$${fmt(whatIfTotal)}** | **${totalDiff >= 0 ? "+" : ""}$${fmt(totalDiff)}** |`,
        "",
      ];

      if (totalDiff > 0) {
        lines.push(`📈 This change **increases** your total tax by **$${fmt(totalDiff)}**.`);
      } else if (totalDiff < 0) {
        lines.push(`📉 This change **saves** you **$${fmt(Math.abs(totalDiff))}** in total tax.`);
      } else {
        lines.push(`➡️ This change has **no impact** on your total tax.`);
      }

      // Roth conversion specific insight
      if (params.whatIfRothConversion) {
        const conversionTaxCost = federalDiff;
        lines.push(
          "",
          `### Roth Conversion Analysis`,
          `- Conversion amount: $${fmt(params.whatIfRothConversion)}`,
          `- Tax cost of conversion: $${fmt(conversionTaxCost)}`,
          `- Effective conversion tax rate: ${(conversionTaxCost / params.whatIfRothConversion * 100).toFixed(2)}%`,
          `- Break-even: If your future tax rate exceeds ${(conversionTaxCost / params.whatIfRothConversion * 100).toFixed(0)}%, the conversion pays off`,
        );
      }

      // Relocation specific insight
      if (params.whatIfNewState && params.currentState) {
        lines.push(
          "",
          `### Relocation Analysis`,
          `- State tax savings: $${fmt(Math.abs(stateDiff))}/year`,
          `- Monthly savings: $${fmt(Math.round(Math.abs(stateDiff) / 12))}/month`,
          stateDiff < 0 ? `- Over 5 years: ~$${fmt(Math.abs(stateDiff) * 5)} saved` : "",
        );
      }

      lines.push("", `> ⚠️ Simplified estimate. Does not account for all deductions, credits, or state-specific rules.`);

      return { content: [{ type: "text", text: lines.filter(Boolean).join("\n") }] };
    }
  );

  // --- Tool 6: Audit Risk Assessment ---
  server.tool(
    "assess_audit_risk",
    "Evaluate your IRS audit risk based on your tax return profile. " +
    "Identifies red flags, scores your risk level, and provides tips to reduce audit exposure.",
    {
      filingStatus: FilingStatusEnum,
      grossIncome: z.number().min(0).describe("Total gross income"),
      selfEmploymentIncome: z.number().min(0).optional().describe("Self-employment income"),
      cashBusiness: z.boolean().optional().describe("Is your business cash-intensive (restaurant, salon, etc.)?"),
      homeOfficeDeduction: z.boolean().optional().describe("Claiming home office deduction?"),
      charitableDonations: z.number().min(0).optional().describe("Total charitable donations"),
      charitableNonCash: z.number().min(0).optional().describe("Non-cash charitable donations (clothing, property)"),
      businessMeals: z.number().min(0).optional().describe("Business meal deductions"),
      vehicleDeduction: z.number().min(0).optional().describe("Vehicle/mileage deduction"),
      rentalLosses: z.number().min(0).optional().describe("Rental property losses claimed"),
      cryptoTransactions: z.boolean().optional().describe("Had cryptocurrency transactions?"),
      foreignAccounts: z.boolean().optional().describe("Have foreign bank accounts or assets?"),
      largeRefund: z.boolean().optional().describe("Expecting a very large refund?"),
      eitcClaimed: z.boolean().optional().describe("Claiming EITC?"),
      roundNumbers: z.boolean().optional().describe("Are most deductions round numbers ($5,000, $10,000)?"),
    },
    async (params) => {
      const flags: Array<{ item: string; severity: "🔴 High" | "🟡 Medium" | "🟢 Low"; detail: string }> = [];
      let riskScore = 0;

      // High income
      if (params.grossIncome > 500000) {
        flags.push({ item: "High Income", severity: "🟡 Medium", detail: "IRS audits ~1.1% of returns with income $500K-$1M, vs 0.4% overall" });
        riskScore += 15;
      }
      if (params.grossIncome > 1000000) {
        flags.push({ item: "Very High Income ($1M+)", severity: "🔴 High", detail: "IRS audits ~2-4% of returns with income over $1M" });
        riskScore += 25;
      }

      // Self-employment
      if (params.selfEmploymentIncome && params.selfEmploymentIncome > 0) {
        riskScore += 10;
        flags.push({ item: "Self-Employment Income", severity: "🟡 Medium", detail: "Schedule C filers are audited at higher rates. Keep detailed records" });

        if (params.cashBusiness) {
          riskScore += 20;
          flags.push({ item: "Cash-Intensive Business", severity: "🔴 High", detail: "Cash businesses are top audit targets. IRS uses statistical models to detect underreporting" });
        }

        // SE losses
        if (params.selfEmploymentIncome < 0) {
          riskScore += 15;
          flags.push({ item: "Business Losses", severity: "🟡 Medium", detail: "Repeated business losses may trigger hobby loss rules (IRC §183)" });
        }
      }

      // Home office
      if (params.homeOfficeDeduction) {
        riskScore += 8;
        flags.push({ item: "Home Office Deduction", severity: "🟢 Low", detail: "Less risky than reputation suggests, but must meet exclusive-use test. Consider simplified method ($5/sq ft)" });
      }

      // Charitable donations
      const charityRatio = params.grossIncome > 0 ? (params.charitableDonations ?? 0) / params.grossIncome : 0;
      if (charityRatio > 0.10) {
        riskScore += 10;
        flags.push({ item: "High Charitable Donations", severity: "🟡 Medium", detail: `Donations are ${(charityRatio * 100).toFixed(1)}% of income (IRS average is ~3-5%). Keep receipts for all donations over $250` });
      }
      if ((params.charitableNonCash ?? 0) > 5000) {
        riskScore += 12;
        flags.push({ item: "Large Non-Cash Donations", severity: "🟡 Medium", detail: "Non-cash donations over $5,000 require qualified appraisal (Form 8283). Over $500 requires Form 8283 Section A" });
      }

      // Vehicle
      if ((params.vehicleDeduction ?? 0) > 10000) {
        riskScore += 8;
        flags.push({ item: "Large Vehicle Deduction", severity: "🟢 Low", detail: "Keep a mileage log. IRS may question 100% business use. Mixed-use vehicles should prorate" });
      }

      // Rental losses
      if ((params.rentalLosses ?? 0) > 25000) {
        riskScore += 10;
        flags.push({ item: "Large Rental Losses", severity: "🟡 Medium", detail: "Passive loss rules limit deduction to $25K if AGI < $100K. Real estate professional exception requires 750+ hours" });
      }

      // Crypto
      if (params.cryptoTransactions) {
        riskScore += 8;
        flags.push({ item: "Cryptocurrency", severity: "🟡 Medium", detail: "IRS requires reporting all crypto transactions. Form 1040 asks directly about virtual currency. Exchanges report via 1099-DA" });
      }

      // Foreign accounts
      if (params.foreignAccounts) {
        riskScore += 15;
        flags.push({ item: "Foreign Accounts/Assets", severity: "🔴 High", detail: "Must file FBAR (FinCEN 114) if aggregate balance exceeds $10K. FATCA Form 8938 if assets exceed $50K. Penalties for non-filing are severe" });
      }

      // EITC
      if (params.eitcClaimed) {
        riskScore += 10;
        flags.push({ item: "EITC Claimed", severity: "🟡 Medium", detail: "EITC returns are audited at higher rates (~1.1%). IRS focuses on qualifying child and income verification" });
      }

      // Round numbers
      if (params.roundNumbers) {
        riskScore += 5;
        flags.push({ item: "Round Number Deductions", severity: "🟢 Low", detail: "Exact round numbers ($5,000, $10,000) look estimated rather than actual. Use precise amounts from receipts" });
      }

      // Large refund
      if (params.largeRefund) {
        riskScore += 5;
        flags.push({ item: "Large Refund", severity: "🟢 Low", detail: "Very large refunds may trigger additional review. Consider adjusting W-4 withholding" });
      }

      // Risk level
      let riskLevel: string;
      let riskEmoji: string;
      if (riskScore >= 50) { riskLevel = "HIGH"; riskEmoji = "🔴"; }
      else if (riskScore >= 25) { riskLevel = "MODERATE"; riskEmoji = "🟡"; }
      else { riskLevel = "LOW"; riskEmoji = "🟢"; }

      const lines = [
        `## 🔍 Audit Risk Assessment`,
        "",
        `**Risk Level**: ${riskEmoji} **${riskLevel}** (score: ${riskScore}/100)`,
        `**Income**: $${fmt(params.grossIncome)} | **Filing**: ${params.filingStatus.replace(/_/g, " ")}`,
        "",
      ];

      if (flags.length > 0) {
        lines.push(
          `### Red Flags Identified`,
          "",
          `| Severity | Item | Detail |`,
          `|----------|------|--------|`,
          ...flags.map((f) => `| ${f.severity} | ${f.item} | ${f.detail} |`),
          "",
        );
      } else {
        lines.push("✅ No significant audit red flags identified.", "");
      }

      lines.push(
        `### Tips to Reduce Audit Risk`,
        "",
        "- Keep receipts and documentation for ALL deductions",
        "- Use precise amounts, not round numbers",
        "- File electronically (paper returns have higher error rates)",
        "- Report ALL income (IRS receives copies of your W-2s and 1099s)",
        "- If self-employed, keep separate business bank account",
        "- Respond promptly to any IRS correspondence",
        "",
        `### IRS Audit Rates (2024 data)`,
        `| Income Range | Audit Rate |`,
        `|---|---|`,
        `| Under $25K (no EITC) | ~0.2% |`,
        `| $25K-$100K | ~0.3% |`,
        `| $100K-$500K | ~0.4% |`,
        `| $500K-$1M | ~1.1% |`,
        `| $1M-$5M | ~2.0% |`,
        `| $5M+ | ~4.0% |`,
        "",
        `> 📝 Overall audit rate is ~0.4%. Most audits are correspondence audits (by mail), not in-person.`,
        `> ⚠️ This is an informal risk assessment, not a guarantee of audit or non-audit.`,
      );

      return { content: [{ type: "text", text: lines.join("\n") }] };
    }
  );

}
