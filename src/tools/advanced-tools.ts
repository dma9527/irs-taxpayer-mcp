/**
 * Advanced MCP tools: document checklist, capital gains optimizer,
 * retirement withdrawals, multi-year planner, relocation analysis.
 */

import { z } from "zod";
import { fmt, FilingStatusEnum } from "./shared.js";
import { type McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { calculateTax } from "../calculators/tax-calculator.js";
import { calculateStateTax } from "../calculators/state-tax-calculator.js";
import { getTaxYearData, getSaltCap, type FilingStatus } from "../data/tax-brackets.js";



export function registerAdvancedTools(server: McpServer): void {
  // --- Tool 7: Tax Document Checklist ---
  server.tool(
    "get_tax_document_checklist",
    "Generate a personalized checklist of tax documents you need to gather for filing. " +
    "Based on your income sources, deductions, and life events.",
    {
      hasW2: z.boolean().optional().describe("Have W-2 employment"),
      hasSelfEmployment: z.boolean().optional().describe("Have self-employment/freelance income"),
      hasInvestments: z.boolean().optional().describe("Have investment accounts (stocks, bonds, crypto)"),
      hasRentalProperty: z.boolean().optional().describe("Own rental property"),
      hasMortgage: z.boolean().optional().describe("Have a mortgage"),
      hasStudentLoans: z.boolean().optional().describe("Paying student loans"),
      hasChildren: z.boolean().optional().describe("Have dependent children"),
      hasChildcare: z.boolean().optional().describe("Pay for childcare"),
      hasEducationExpenses: z.boolean().optional().describe("Paying tuition or student expenses"),
      hasHealthInsurance: z.boolean().optional().describe("Have health insurance (marketplace or employer)"),
      hasHSA: z.boolean().optional().describe("Have HSA account"),
      hasRetirementContributions: z.boolean().optional().describe("Contributed to IRA/401k"),
      hasCharitableDonations: z.boolean().optional().describe("Made charitable donations"),
      hasForeignAccounts: z.boolean().optional().describe("Have foreign bank accounts or income"),
      soldHome: z.boolean().optional().describe("Sold a home this year"),
      gotMarried: z.boolean().optional().describe("Got married this year"),
      gotDivorced: z.boolean().optional().describe("Got divorced this year"),
      hadBaby: z.boolean().optional().describe("Had a baby this year"),
      boughtEV: z.boolean().optional().describe("Bought an electric vehicle"),
      installedSolar: z.boolean().optional().describe("Installed solar panels"),
    },
    async (params) => {
      interface DocItem { doc: string; form: string; deadline: string; notes: string }
      const required: DocItem[] = [];
      const mayNeed: DocItem[] = [];

      // Universal
      required.push(
        { doc: "Prior year tax return", form: "1040", deadline: "—", notes: "For reference and AGI verification" },
        { doc: "Social Security numbers", form: "—", deadline: "—", notes: "For you, spouse, and all dependents" },
        { doc: "Government-issued ID", form: "—", deadline: "—", notes: "Required for e-filing identity verification" },
      );

      // Income
      if (params.hasW2) {
        required.push({ doc: "W-2 (Wage Statement)", form: "W-2", deadline: "Jan 31", notes: "From each employer. Check Box 1 (wages) and Box 2 (federal withheld)" });
      }
      if (params.hasSelfEmployment) {
        required.push(
          { doc: "1099-NEC (Freelance/Contract Income)", form: "1099-NEC", deadline: "Jan 31", notes: "From each client who paid you $600+" },
          { doc: "Business income & expense records", form: "Schedule C", deadline: "—", notes: "Revenue, expenses, receipts, mileage log" },
          { doc: "Estimated tax payment records", form: "1040-ES", deadline: "—", notes: "Dates and amounts of quarterly payments made" },
        );
      }
      if (params.hasInvestments) {
        required.push(
          { doc: "1099-B (Investment Sales)", form: "1099-B", deadline: "Feb 15", notes: "From brokerages. Shows proceeds and cost basis" },
          { doc: "1099-DIV (Dividends)", form: "1099-DIV", deadline: "Jan 31", notes: "Ordinary and qualified dividends" },
          { doc: "1099-INT (Interest Income)", form: "1099-INT", deadline: "Jan 31", notes: "From banks and financial institutions" },
        );
        mayNeed.push(
          { doc: "Corrected 1099s", form: "1099", deadline: "Feb-Mar", notes: "Brokerages often issue corrections. Wait until mid-Feb before filing" },
        );
      }
      if (params.hasRentalProperty) {
        required.push(
          { doc: "Rental income records", form: "Schedule E", deadline: "—", notes: "Rent received, expenses, depreciation" },
          { doc: "1099-MISC (if applicable)", form: "1099-MISC", deadline: "Jan 31", notes: "If rental income reported by property manager" },
        );
      }

      // Deductions
      if (params.hasMortgage) {
        required.push({ doc: "1098 (Mortgage Interest)", form: "1098", deadline: "Jan 31", notes: "Mortgage interest and property tax paid through escrow" });
      }
      if (params.hasStudentLoans) {
        required.push({ doc: "1098-E (Student Loan Interest)", form: "1098-E", deadline: "Jan 31", notes: "Interest paid on qualified student loans" });
      }
      if (params.hasEducationExpenses) {
        required.push({ doc: "1098-T (Tuition Statement)", form: "1098-T", deadline: "Jan 31", notes: "From educational institution for AOTC/LLC" });
      }
      if (params.hasCharitableDonations) {
        required.push({ doc: "Charitable donation receipts", form: "Schedule A", deadline: "—", notes: "Written acknowledgment for donations $250+. Appraisal for non-cash $5,000+" });
      }
      if (params.hasHSA) {
        required.push(
          { doc: "1099-SA (HSA Distributions)", form: "1099-SA", deadline: "Jan 31", notes: "If you took HSA withdrawals" },
          { doc: "5498-SA (HSA Contributions)", form: "5498-SA", deadline: "May 31", notes: "Total contributions for the year" },
        );
      }

      // Credits
      if (params.hasChildren) {
        mayNeed.push({ doc: "Child's SSN or ITIN", form: "—", deadline: "—", notes: "Required for CTC. Must be issued before filing deadline" });
      }
      if (params.hasChildcare) {
        required.push({ doc: "Childcare provider info", form: "Form 2441", deadline: "—", notes: "Provider name, address, EIN/SSN, amount paid" });
      }
      if (params.hasHealthInsurance) {
        mayNeed.push({ doc: "1095-A (Marketplace Insurance)", form: "1095-A", deadline: "Jan 31", notes: "Required if you had ACA marketplace coverage (for Premium Tax Credit)" });
      }
      if (params.hasRetirementContributions) {
        mayNeed.push({ doc: "5498 (IRA Contributions)", form: "5498", deadline: "May 31", notes: "Confirms IRA contributions. May arrive after filing deadline" });
      }
      if (params.boughtEV) {
        required.push({ doc: "EV purchase documentation", form: "Form 8936", deadline: "—", notes: "VIN, purchase date, MSRP, dealer confirmation of credit transfer" });
      }
      if (params.installedSolar) {
        required.push({ doc: "Solar installation receipts", form: "Form 5695", deadline: "—", notes: "Total cost, date placed in service, contractor info" });
      }

      // Life events
      if (params.soldHome) {
        required.push({ doc: "1099-S (Home Sale Proceeds)", form: "1099-S", deadline: "—", notes: "Sale price, closing costs, original purchase records for gain calculation" });
      }
      if (params.gotMarried || params.gotDivorced) {
        mayNeed.push({ doc: "Marriage/divorce certificate", form: "—", deadline: "—", notes: "Determines filing status. Status as of Dec 31 applies for the full year" });
      }
      if (params.hadBaby) {
        required.push({ doc: "Baby's SSN", form: "—", deadline: "—", notes: "Apply via Form SS-5 at hospital or SSA office. Needed for CTC" });
      }
      if (params.hasForeignAccounts) {
        required.push(
          { doc: "Foreign bank account statements", form: "FBAR (FinCEN 114)", deadline: "Apr 15 (ext Oct 15)", notes: "Required if aggregate balance exceeds $10K at any point" },
          { doc: "Foreign asset statement", form: "Form 8938 (FATCA)", deadline: "With return", notes: "Required if assets exceed $50K (single) or $100K (MFJ) on last day of year" },
        );
      }

      const lines = [
        `## 📋 Tax Document Checklist`,
        "",
        `### Required Documents (${required.length})`,
        "",
        `| Document | Form | Deadline | Notes |`,
        `|----------|------|----------|-------|`,
        ...required.map((d) => `| ${d.doc} | ${d.form} | ${d.deadline} | ${d.notes} |`),
      ];

      if (mayNeed.length > 0) {
        lines.push(
          "",
          `### May Also Need (${mayNeed.length})`,
          "",
          `| Document | Form | Deadline | Notes |`,
          `|----------|------|----------|-------|`,
          ...mayNeed.map((d) => `| ${d.doc} | ${d.form} | ${d.deadline} | ${d.notes} |`),
        );
      }

      lines.push(
        "",
        `### Filing Tips`,
        "- Wait until mid-February to file if you have investment accounts (corrected 1099s)",
        "- E-file for fastest processing and fewer errors",
        "- Keep all documents for at least 3 years (6 years if income underreported by 25%+)",
        "- If missing a document, file an extension (Form 4868) by April 15",
        "",
        `> 📝 This checklist is based on the information you provided. You may need additional documents for complex situations.`,
      );

      return { content: [{ type: "text", text: lines.join("\n") }] };
    }
  );

  // --- Tool 8: Capital Gains Optimizer ---
  server.tool(
    "optimize_capital_gains",
    "Analyze investment lots and suggest which to sell to minimize tax. " +
    "Considers long-term vs short-term, 0% bracket space, loss harvesting, and wash sale rules.",
    {
      taxYear: z.number().describe("Tax year"),
      filingStatus: FilingStatusEnum,
      ordinaryIncome: z.number().min(0).describe("Ordinary income (W-2, SE, interest, etc.) before investment sales"),
      lots: z.array(z.object({
        name: z.string().describe("Investment name (e.g., 'AAPL', 'VTI')"),
        shares: z.number().min(0),
        costBasis: z.number().describe("Total cost basis"),
        currentValue: z.number().describe("Current market value"),
        holdingMonths: z.number().int().min(0).describe("Months held"),
      })).describe("Investment lots to analyze"),
      targetGainOrLoss: z.number().optional().describe("Target net gain/loss to realize (negative for harvesting losses)"),
    },
    async (params) => {
      const taxData = getTaxYearData(params.taxYear);
      if (!taxData) {
        return { content: [{ type: "text", text: `Tax year ${params.taxYear} not supported.` }], isError: true };
      }

      // Analyze each lot
      const analyzed = params.lots.map((lot) => {
        const gain = lot.currentValue - lot.costBasis;
        const isLongTerm = lot.holdingMonths >= 12;
        const gainPct = lot.costBasis > 0 ? gain / lot.costBasis : 0;
        return { ...lot, gain, isLongTerm, gainPct };
      });

      // Sort: losses first (for harvesting), then by tax efficiency
      const losses = analyzed.filter((l) => l.gain < 0).sort((a, b) => a.gain - b.gain);
      const stGains = analyzed.filter((l) => l.gain > 0 && !l.isLongTerm).sort((a, b) => a.gain - b.gain);
      const ltGains = analyzed.filter((l) => l.gain > 0 && l.isLongTerm).sort((a, b) => a.gain - b.gain);

      const totalUnrealizedGain = analyzed.reduce((s, l) => s + l.gain, 0);
      const totalLosses = losses.reduce((s, l) => s + l.gain, 0);
      const totalSTGains = stGains.reduce((s, l) => s + l.gain, 0);
      const totalLTGains = ltGains.reduce((s, l) => s + l.gain, 0);

      // 0% CG bracket space
      const deduction = taxData.standardDeduction[params.filingStatus];
      const taxableOrdinary = Math.max(0, params.ordinaryIncome - deduction);
      const zeroBracketThreshold = taxData.capitalGainsBrackets[params.filingStatus][0].threshold;
      const zeroBracketSpace = Math.max(0, zeroBracketThreshold - taxableOrdinary);

      const lines = [
        `## 📊 Capital Gains Optimizer — TY${params.taxYear}`,
        `**Ordinary Income**: $${fmt(params.ordinaryIncome)} | **Filing**: ${params.filingStatus.replace(/_/g, " ")}`,
        "",
        `### Portfolio Summary`,
        `| Lot | Shares | Basis | Value | Gain/Loss | Type | Hold |`,
        `|-----|--------|-------|-------|-----------|------|------|`,
        ...analyzed.map((l) => {
          const type = l.isLongTerm ? "LT" : "ST";
          const gainStr = l.gain >= 0 ? `+$${fmt(l.gain)}` : `-$${fmt(Math.abs(l.gain))}`;
          return `| ${l.name} | ${l.shares} | $${fmt(l.costBasis)} | $${fmt(l.currentValue)} | ${gainStr} | ${type} | ${l.holdingMonths}mo |`;
        }),
        "",
        `| Category | Amount |`,
        `|----------|--------|`,
        `| Unrealized Long-Term Gains | $${fmt(totalLTGains)} |`,
        `| Unrealized Short-Term Gains | $${fmt(totalSTGains)} |`,
        `| Unrealized Losses | $${fmt(Math.abs(totalLosses))} |`,
        `| Net Unrealized | $${fmt(totalUnrealizedGain)} |`,
        "",
        `### 0% Capital Gains Bracket`,
        `| Item | Amount |`,
        `|------|--------|`,
        `| Taxable ordinary income | $${fmt(taxableOrdinary)} |`,
        `| 0% CG threshold | $${fmt(zeroBracketThreshold)} |`,
        `| **Space in 0% bracket** | **$${fmt(zeroBracketSpace)}** |`,
        "",
      ];

      // Recommendations
      lines.push(`### Recommendations`, "");

      // Tax-gain harvesting
      if (zeroBracketSpace > 0 && totalLTGains > 0) {
        const harvestable = Math.min(zeroBracketSpace, totalLTGains);
        lines.push(
          `#### ✅ Tax-Gain Harvesting Opportunity`,
          `You have $${fmt(zeroBracketSpace)} of space in the 0% long-term capital gains bracket.`,
          `Sell up to $${fmt(harvestable)} in long-term gains **tax-free** and reset your cost basis higher.`,
          "",
          `Best lots to sell (long-term gains, smallest first):`,
          ...ltGains.slice(0, 3).map((l) => `- ${l.name}: +$${fmt(l.gain)} (${l.holdingMonths} months held)`),
          "",
        );
      }

      // Tax-loss harvesting
      if (totalLosses < 0) {
        const offsetGains = Math.min(Math.abs(totalLosses), totalSTGains + totalLTGains);
        const excessLoss = Math.abs(totalLosses) - offsetGains;
        const ordinaryOffset = Math.min(excessLoss, 3000);

        lines.push(
          `#### 📉 Tax-Loss Harvesting`,
          `You have $${fmt(Math.abs(totalLosses))} in unrealized losses available.`,
          offsetGains > 0 ? `- Offset $${fmt(offsetGains)} in gains (saves tax on those gains)` : "",
          ordinaryOffset > 0 ? `- Deduct $${fmt(ordinaryOffset)} against ordinary income ($3K annual limit)` : "",
          excessLoss > 3000 ? `- Carry forward $${fmt(excessLoss - 3000)} to future years` : "",
          "",
          `Best lots to harvest (largest losses):`,
          ...losses.slice(0, 3).map((l) => `- ${l.name}: $${fmt(Math.abs(l.gain))} loss (${l.isLongTerm ? "LT" : "ST"})`),
          "",
          `⚠️ **Wash Sale Rule**: Do not repurchase substantially identical securities within 30 days before or after the sale.`,
          "",
        );
      }

      // Short-term to long-term conversion
      const almostLT = analyzed.filter((l) => l.gain > 0 && !l.isLongTerm && l.holdingMonths >= 10);
      if (almostLT.length > 0) {
        lines.push(
          `#### ⏳ Wait for Long-Term Treatment`,
          `These lots have gains but are close to the 12-month long-term threshold:`,
          ...almostLT.map((l) => `- ${l.name}: +$${fmt(l.gain)}, ${12 - l.holdingMonths} month(s) until long-term`),
          `Waiting saves the difference between your ordinary rate and the lower CG rate.`,
          "",
        );
      }

      lines.push(`> ⚠️ This is educational guidance, not investment advice. Consider your full financial picture.`);

      return { content: [{ type: "text", text: lines.filter(Boolean).join("\n") }] };
    }
  );

  // --- Tool 9: Retirement Withdrawal Strategy ---
  server.tool(
    "plan_retirement_withdrawals",
    "Plan tax-efficient retirement withdrawals. Determines optimal order to draw from " +
    "Traditional IRA, Roth IRA, and taxable accounts to minimize lifetime tax.",
    {
      taxYear: z.number().describe("Tax year"),
      filingStatus: FilingStatusEnum,
      age: z.number().int().min(0).describe("Your current age"),
      traditionalBalance: z.number().min(0).describe("Traditional IRA/401k balance"),
      rothBalance: z.number().min(0).describe("Roth IRA/401k balance"),
      taxableBalance: z.number().min(0).describe("Taxable brokerage account balance"),
      socialSecurityIncome: z.number().min(0).optional().describe("Annual Social Security income"),
      pensionIncome: z.number().min(0).optional().describe("Annual pension income"),
      annualSpending: z.number().min(0).describe("Annual spending need (pre-tax)"),
      rothConversionInterest: z.boolean().optional().describe("Interested in Roth conversion strategy?"),
    },
    async (params) => {
      const taxData = getTaxYearData(params.taxYear);
      if (!taxData) {
        return { content: [{ type: "text", text: `Tax year ${params.taxYear} not supported.` }], isError: true };
      }

      const ss = params.socialSecurityIncome ?? 0;
      const pension = params.pensionIncome ?? 0;
      const fixedIncome = ss + pension;
      const gap = Math.max(0, params.annualSpending - fixedIncome);
      const totalBalance = params.traditionalBalance + params.rothBalance + params.taxableBalance;

      // Determine withdrawal order
      const stdDeduction = taxData.standardDeduction[params.filingStatus];
      const seniorBonus = taxData.obbbDeductions && params.age >= 65 ? taxData.obbbDeductions.seniorBonus.amount : 0;
      const totalDeduction = stdDeduction + seniorBonus;

      // Tax on fixed income
      const taxableSSPortion = ss > 0 ? Math.min(ss * 0.85, Math.max(0, (fixedIncome + gap / 2 - 25000) * 0.5)) : 0;
      const taxableFixedIncome = taxableSSPortion + pension;

      // Space in low brackets
      const lowBracketSpace = Math.max(0, totalDeduction - taxableFixedIncome);

      // Withdrawal strategy
      const lines = [
        `## 🏦 Retirement Withdrawal Strategy — TY${params.taxYear}`,
        `**Age**: ${params.age} | **Filing**: ${params.filingStatus.replace(/_/g, " ")}`,
        "",
        `### Account Balances`,
        `| Account | Balance | Tax on Withdrawal |`,
        `|---------|---------|-------------------|`,
        `| Traditional IRA/401k | $${fmt(params.traditionalBalance)} | Taxed as ordinary income |`,
        `| Roth IRA/401k | $${fmt(params.rothBalance)} | Tax-free (if qualified) |`,
        `| Taxable Brokerage | $${fmt(params.taxableBalance)} | CG tax on gains only |`,
        `| **Total** | **$${fmt(totalBalance)}** | |`,
        "",
        `### Income & Spending`,
        `| Item | Amount |`,
        `|------|--------|`,
        ss > 0 ? `| Social Security | $${fmt(ss)} |` : "",
        pension > 0 ? `| Pension | $${fmt(pension)} |` : "",
        `| Fixed Income | $${fmt(fixedIncome)} |`,
        `| Annual Spending Need | $${fmt(params.annualSpending)} |`,
        `| **Gap to Fill from Savings** | **$${fmt(gap)}** |`,
        "",
        `### Recommended Withdrawal Order`,
        "",
      ];

      let step = 1;

      // Step 1: Fill deduction space with Traditional
      if (lowBracketSpace > 0 && params.traditionalBalance > 0) {
        const traditionalWithdraw = Math.min(lowBracketSpace, gap, params.traditionalBalance);
        lines.push(
          `**Step ${step++}: Traditional IRA — $${fmt(traditionalWithdraw)}** (fills deduction/low bracket space)`,
          `> Withdraw up to $${fmt(lowBracketSpace)} from Traditional to fill the ${(0).toFixed(0)}% bracket.`,
          `> Standard deduction ($${fmt(stdDeduction)})${seniorBonus > 0 ? ` + senior bonus ($${fmt(seniorBonus)})` : ""} shelters this from tax.`,
          "",
        );
      }

      // Step 2: Taxable account (favorable CG rates)
      if (params.taxableBalance > 0) {
        lines.push(
          `**Step ${step++}: Taxable Brokerage Account**`,
          `> Only gains are taxed (at 0%/15%/20% CG rates). Cost basis is returned tax-free.`,
          `> Prioritize lots with highest cost basis (lowest gain) for tax efficiency.`,
          "",
        );
      }

      // Step 3: Traditional for remaining
      if (params.traditionalBalance > 0) {
        lines.push(
          `**Step ${step++}: Traditional IRA (remaining need)**`,
          `> Taxed as ordinary income. Withdraw only what's needed to avoid jumping brackets.`,
          "",
        );
      }

      // Step 4: Roth last
      if (params.rothBalance > 0) {
        lines.push(
          `**Step ${step++}: Roth IRA (last resort)**`,
          `> Tax-free withdrawals. Preserve as long as possible for maximum tax-free growth.`,
          `> No RMDs on Roth IRA — can pass to heirs tax-free.`,
          "",
        );
      }

      // RMD warning
      if (params.age >= 73 && params.traditionalBalance > 0) {
        const rmdFactor = params.age <= 75 ? 26.5 : params.age <= 80 ? 22.9 : params.age <= 85 ? 18.7 : 14.8;
        const rmd = Math.round(params.traditionalBalance / rmdFactor);
        lines.push(
          `### ⚠️ Required Minimum Distribution (RMD)`,
          `At age ${params.age}, you MUST withdraw at least **$${fmt(rmd)}** from Traditional accounts.`,
          `RMD = $${fmt(params.traditionalBalance)} ÷ ${rmdFactor} (life expectancy factor)`,
          `Failure to take RMD: 25% penalty on the amount not withdrawn.`,
          "",
        );
      } else if (params.age >= 70) {
        lines.push(
          `### 📝 RMD Reminder`,
          `RMDs begin at age 73 (SECURE 2.0). You have ${73 - params.age} year(s) to do Roth conversions before RMDs start.`,
          "",
        );
      }

      // Roth conversion opportunity
      if (params.rothConversionInterest && params.traditionalBalance > 0) {
        const conversionSpace = Math.max(0, totalDeduction - taxableFixedIncome);
        lines.push(
          `### 🔄 Roth Conversion Opportunity`,
          `You have ~$${fmt(conversionSpace)} of "free" conversion space (covered by deductions).`,
          `Converting Traditional → Roth now means:`,
          `- Pay tax at today's low rate`,
          `- Future growth is tax-free`,
          `- Reduces future RMDs`,
          `- No RMDs on Roth ever`,
          `Use the \`simulate_tax_scenario\` tool to model specific conversion amounts.`,
          "",
        );
      }

      // Longevity estimate
      if (totalBalance > 0 && gap > 0) {
        const yearsOfSavings = Math.round(totalBalance / gap);
        lines.push(
          `### 📊 Longevity Estimate`,
          `At $${fmt(gap)}/year withdrawal rate, your savings could last ~${yearsOfSavings} years (simplified, no growth assumed).`,
          yearsOfSavings < 20 ? `⚠️ Consider reducing spending or delaying Social Security for a higher benefit.` : "",
          "",
        );
      }

      lines.push(`> ⚠️ Simplified analysis. Does not account for investment growth, inflation, or state taxes. Consult a financial advisor.`);

      return { content: [{ type: "text", text: lines.filter(Boolean).join("\n") }] };
    }
  );

  // --- Tool 10: Multi-Year Tax Planner ---
  server.tool(
    "plan_multi_year_taxes",
    "Create a 3-5 year tax projection and strategy. Models income changes, Roth conversions, " +
    "retirement contributions, and bracket management across multiple years.",
    {
      filingStatus: FilingStatusEnum,
      currentAge: z.number().int().min(0),
      years: z.array(z.object({
        year: z.number().describe("Tax year (2024 or 2025)"),
        expectedIncome: z.number().min(0).describe("Expected gross income"),
        selfEmploymentIncome: z.number().min(0).optional(),
        plannedRothConversion: z.number().min(0).optional().describe("Planned Roth conversion amount"),
        planned401k: z.number().min(0).optional().describe("Planned 401k contribution"),
        plannedIRA: z.number().min(0).optional().describe("Planned IRA contribution"),
        dependents: z.number().int().min(0).optional(),
        stateCode: z.string().length(2).optional(),
      })).min(1).max(5).describe("Year-by-year projections"),
    },
    async (params) => {
      const results = params.years.map((yr) => {
        const retirement = (yr.planned401k ?? 0) + (yr.plannedIRA ?? 0);
        const totalIncome = yr.expectedIncome + (yr.plannedRothConversion ?? 0);

        const federal = calculateTax({
          taxYear: Math.min(yr.year, 2025), // use 2025 data for future years
          filingStatus: params.filingStatus,
          grossIncome: totalIncome,
          selfEmploymentIncome: yr.selfEmploymentIncome,
          aboveTheLineDeductions: retirement > 0 ? retirement : undefined,
          dependents: yr.dependents,
        });

        let stateTax = 0;
        let stateName = "";
        if (yr.stateCode) {
          const sr = calculateStateTax({
            stateCode: yr.stateCode,
            taxableIncome: federal.adjustedGrossIncome,
            filingStatus: params.filingStatus === "married_filing_jointly" ? "married" : "single",
          });
          if (sr) { stateTax = sr.tax; stateName = sr.stateName; }
        }

        return {
          year: yr.year,
          income: yr.expectedIncome,
          rothConversion: yr.plannedRothConversion ?? 0,
          retirement,
          federalTax: federal.totalFederalTax,
          stateTax,
          stateName,
          totalTax: federal.totalFederalTax + stateTax,
          effectiveRate: federal.effectiveRate,
          marginalRate: federal.marginalRate,
          takeHome: totalIncome - federal.totalFederalTax - stateTax,
        };
      });

      const totalTaxAllYears = results.reduce((s, r) => s + r.totalTax, 0);
      const totalIncomeAllYears = results.reduce((s, r) => s + r.income + r.rothConversion, 0);

      const lines = [
        `## 📈 Multi-Year Tax Plan`,
        `**${params.filingStatus.replace(/_/g, " ")}** | Age ${params.currentAge}`,
        "",
        `### Year-by-Year Projection`,
        `| Year | Income | Roth Conv. | Retirement | Federal Tax | State Tax | Total Tax | Eff. Rate | Marginal |`,
        `|------|--------|-----------|------------|-------------|-----------|-----------|-----------|----------|`,
        ...results.map((r) =>
          `| ${r.year} | $${fmt(r.income)} | $${fmt(r.rothConversion)} | $${fmt(r.retirement)} | $${fmt(r.federalTax)} | $${fmt(r.stateTax)} | $${fmt(r.totalTax)} | ${(r.effectiveRate * 100).toFixed(1)}% | ${(r.marginalRate * 100).toFixed(0)}% |`
        ),
        "",
        `| **Totals** | $${fmt(totalIncomeAllYears)} | | | | | **$${fmt(totalTaxAllYears)}** | **${(totalTaxAllYears / totalIncomeAllYears * 100).toFixed(1)}%** | |`,
        "",
      ];

      // Strategy insights
      lines.push(`### Strategy Insights`, "");

      // Bracket management
      const rates = results.map((r) => r.marginalRate);
      const minRate = Math.min(...rates);
      const maxRate = Math.max(...rates);
      if (maxRate > minRate) {
        const lowYears = results.filter((r) => r.marginalRate === minRate).map((r) => r.year);
        lines.push(
          `📊 **Bracket Variation**: Your marginal rate ranges from ${(minRate * 100).toFixed(0)}% to ${(maxRate * 100).toFixed(0)}%.`,
          `Low-rate years (${lowYears.join(", ")}): Consider accelerating income or Roth conversions in these years.`,
          "",
        );
      }

      // Roth conversion analysis
      const conversionYears = results.filter((r) => r.rothConversion > 0);
      if (conversionYears.length > 0) {
        const totalConverted = conversionYears.reduce((s, r) => s + r.rothConversion, 0);
        lines.push(
          `🔄 **Roth Conversion Plan**: $${fmt(totalConverted)} total over ${conversionYears.length} year(s).`,
          `Spreading conversions across years keeps you in lower brackets.`,
          "",
        );
      }

      // Retirement contribution impact
      const totalRetirement = results.reduce((s, r) => s + r.retirement, 0);
      if (totalRetirement > 0) {
        const avgRate = totalIncomeAllYears > 0 ? totalTaxAllYears / totalIncomeAllYears : 0;
        const estimatedSavings = Math.round(totalRetirement * avgRate);
        lines.push(
          `💰 **Retirement Contributions**: $${fmt(totalRetirement)} total.`,
          `Estimated tax savings: ~$${fmt(estimatedSavings)} (at avg ${(avgRate * 100).toFixed(1)}% rate).`,
          "",
        );
      }

      // Age-based milestones
      const milestones: string[] = [];
      for (const r of results) {
        const ageInYear = params.currentAge + (r.year - results[0].year);
        if (ageInYear === 59) milestones.push(`${r.year}: Age 59½ — penalty-free retirement withdrawals`);
        if (ageInYear === 62) milestones.push(`${r.year}: Age 62 — earliest Social Security eligibility`);
        if (ageInYear === 65) milestones.push(`${r.year}: Age 65 — Medicare eligible, senior bonus deduction ($6K)`);
        if (ageInYear === 67) milestones.push(`${r.year}: Age 67 — full Social Security retirement age`);
        if (ageInYear === 73) milestones.push(`${r.year}: Age 73 — RMDs begin (SECURE 2.0)`);
      }
      if (milestones.length > 0) {
        lines.push(`### 🎯 Age Milestones`, "", ...milestones.map((m) => `- ${m}`), "");
      }

      lines.push(`> ⚠️ Uses TY2024/2025 tax law for all years. Future tax law changes may affect projections.`);

      return { content: [{ type: "text", text: lines.join("\n") }] };
    }
  );

  // --- Tool 11: Relocation Deep Analysis ---
  server.tool(
    "analyze_relocation_taxes",
    "In-depth relocation tax analysis comparing two states. Includes state income tax, " +
    "effective combined rate, local taxes, and multi-year savings projection.",
    {
      taxYear: z.number().describe("Tax year"),
      filingStatus: FilingStatusEnum,
      grossIncome: z.number().min(0).describe("Annual gross income"),
      fromState: z.string().length(2).describe("Current state code"),
      toState: z.string().length(2).describe("Target state code"),
      selfEmploymentIncome: z.number().min(0).optional(),
      capitalGains: z.number().optional(),
      dependents: z.number().int().min(0).optional(),
      yearsToProject: z.number().int().min(1).max(10).optional().describe("Years to project savings (default: 5)"),
      incomeGrowthRate: z.number().min(0).max(0.5).optional().describe("Annual income growth rate (e.g., 0.03 for 3%)"),
    },
    async (params) => {
      const projYears = params.yearsToProject ?? 5;
      const growth = params.incomeGrowthRate ?? 0;

      // Federal tax (same regardless of state)
      const federal = calculateTax({
        taxYear: params.taxYear,
        filingStatus: params.filingStatus,
        grossIncome: params.grossIncome,
        selfEmploymentIncome: params.selfEmploymentIncome,
        capitalGains: params.capitalGains,
        capitalGainsLongTerm: true,
        dependents: params.dependents,
      });

      const stateFS = params.filingStatus === "married_filing_jointly" ? "married" as const : "single" as const;

      const fromResult = calculateStateTax({ stateCode: params.fromState, taxableIncome: federal.adjustedGrossIncome, filingStatus: stateFS });
      const toResult = calculateStateTax({ stateCode: params.toState, taxableIncome: federal.adjustedGrossIncome, filingStatus: stateFS });

      if (!fromResult || !toResult) {
        return { content: [{ type: "text", text: "Invalid state code." }], isError: true };
      }

      const annualSavings = fromResult.tax - toResult.tax;

      // Multi-year projection
      let cumulativeSavings = 0;
      const projections: Array<{ year: number; income: number; fromTax: number; toTax: number; savings: number; cumulative: number }> = [];

      for (let i = 0; i < projYears; i++) {
        const yearIncome = Math.round(params.grossIncome * Math.pow(1 + growth, i));
        const yearFederal = calculateTax({
          taxYear: Math.min(params.taxYear + i, 2025),
          filingStatus: params.filingStatus,
          grossIncome: yearIncome,
        });
        const yearFrom = calculateStateTax({ stateCode: params.fromState, taxableIncome: yearFederal.adjustedGrossIncome, filingStatus: stateFS });
        const yearTo = calculateStateTax({ stateCode: params.toState, taxableIncome: yearFederal.adjustedGrossIncome, filingStatus: stateFS });
        const yearSavings = (yearFrom?.tax ?? 0) - (yearTo?.tax ?? 0);
        cumulativeSavings += yearSavings;
        projections.push({
          year: params.taxYear + i,
          income: yearIncome,
          fromTax: yearFrom?.tax ?? 0,
          toTax: yearTo?.tax ?? 0,
          savings: yearSavings,
          cumulative: cumulativeSavings,
        });
      }

      const lines = [
        `## 🏠 Relocation Tax Analysis`,
        `**${fromResult.stateName}** → **${toResult.stateName}** | $${fmt(params.grossIncome)} income`,
        "",
        `### Current Year Comparison`,
        `| | ${fromResult.stateName} | ${toResult.stateName} | Difference |`,
        `|---|---|---|---|`,
        `| Tax Type | ${fromResult.taxType} | ${toResult.taxType} | — |`,
        `| State Tax | $${fmt(fromResult.tax)} | $${fmt(toResult.tax)} | ${annualSavings >= 0 ? "-" : "+"}$${fmt(Math.abs(annualSavings))} |`,
        `| Effective Rate | ${(fromResult.effectiveRate * 100).toFixed(2)}% | ${(toResult.effectiveRate * 100).toFixed(2)}% | ${((toResult.effectiveRate - fromResult.effectiveRate) * 100).toFixed(2)}pp |`,
        `| Federal Tax | $${fmt(federal.totalFederalTax)} | $${fmt(federal.totalFederalTax)} | $0 |`,
        `| **Combined Tax** | **$${fmt(federal.totalFederalTax + fromResult.tax)}** | **$${fmt(federal.totalFederalTax + toResult.tax)}** | **${annualSavings >= 0 ? "-" : "+"}$${fmt(Math.abs(annualSavings))}** |`,
        "",
      ];

      if (annualSavings > 0) {
        lines.push(`💰 Moving to ${toResult.stateName} saves **$${fmt(annualSavings)}/year** ($${fmt(Math.round(annualSavings / 12))}/month) in state taxes.`);
      } else if (annualSavings < 0) {
        lines.push(`📈 Moving to ${toResult.stateName} costs **$${fmt(Math.abs(annualSavings))}/year** more in state taxes.`);
      } else {
        lines.push(`➡️ No state tax difference between ${fromResult.stateName} and ${toResult.stateName}.`);
      }

      // Local taxes warning
      if (fromResult.hasLocalTaxes || toResult.hasLocalTaxes) {
        lines.push(
          "",
          `### ⚠️ Local Tax Considerations`,
          fromResult.hasLocalTaxes ? `- ${fromResult.stateName} has local/city income taxes (not included above)` : "",
          toResult.hasLocalTaxes ? `- ${toResult.stateName} has local/city income taxes (not included above)` : "",
          `Use \`get_state_tax_info\` for specific local tax rates.`,
        );
      }

      // Multi-year projection
      lines.push(
        "",
        `### ${projYears}-Year Projection${growth > 0 ? ` (${(growth * 100).toFixed(0)}% annual income growth)` : ""}`,
        `| Year | Income | ${fromResult.stateName} Tax | ${toResult.stateName} Tax | Annual Savings | Cumulative |`,
        `|------|--------|---|---|---|---|`,
        ...projections.map((p) =>
          `| ${p.year} | $${fmt(p.income)} | $${fmt(p.fromTax)} | $${fmt(p.toTax)} | $${fmt(p.savings)} | $${fmt(p.cumulative)} |`
        ),
        "",
        `**${projYears}-year total savings: $${fmt(cumulativeSavings)}**`,
      );

      // SALT deduction impact
      const saltCap = getSaltCap(params.taxYear, params.filingStatus, params.grossIncome);
      if (fromResult.tax > saltCap) {
        lines.push(
          "",
          `### SALT Deduction Impact`,
          `Your ${fromResult.stateName} tax ($${fmt(fromResult.tax)}) exceeds the SALT cap ($${fmt(saltCap)}).`,
          `You lose $${fmt(fromResult.tax - saltCap)} in deductions due to the cap.`,
          toResult.tax <= saltCap ? `In ${toResult.stateName}, your full state tax would be deductible.` : "",
        );
      }

      lines.push(
        "",
        `> ⚠️ Does not include property tax, sales tax, or cost of living differences. These can significantly affect the total financial impact of relocation.`,
      );

      return { content: [{ type: "text", text: lines.filter(Boolean).join("\n") }] };
    }
  );
}
