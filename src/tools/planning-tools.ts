/**
 * MCP tools for tax planning, multi-year comparison, self-employment,
 * real estate, and education tax scenarios.
 */

import { z } from "zod";
import { type McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { calculateTax } from "../calculators/tax-calculator.js";
import { calculateStateTax } from "../calculators/state-tax-calculator.js";
import type { FilingStatus } from "../data/tax-brackets.js";

const FilingStatusEnum = z.enum([
  "single",
  "married_filing_jointly",
  "married_filing_separately",
  "head_of_household",
]);

function fmt(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function registerPlanningTools(server: McpServer): void {

  // --- Tool 1: Year-end tax planning ---
  server.tool(
    "get_tax_planning_tips",
    "Get personalized year-end tax optimization strategies based on your income, deductions, and situation. " +
    "Suggests actions to reduce tax liability before year-end.",
    {
      taxYear: z.number().describe("Tax year to plan for"),
      filingStatus: FilingStatusEnum,
      estimatedIncome: z.number().min(0).describe("Expected total income for the year"),
      currentWithholding: z.number().min(0).optional().describe("Total tax already withheld/paid YTD"),
      hasRetirementPlan: z.boolean().optional().describe("Have access to 401k/403b"),
      currentRetirementContributions: z.number().min(0).optional().describe("YTD retirement contributions"),
      hasHSA: z.boolean().optional().describe("Have HSA-eligible health plan"),
      currentHSAContributions: z.number().min(0).optional().describe("YTD HSA contributions"),
      hasMortgage: z.boolean().optional(),
      estimatedItemizedDeductions: z.number().min(0).optional(),
      hasCapitalGains: z.boolean().optional(),
      estimatedCapitalGains: z.number().optional(),
      hasCapitalLosses: z.boolean().optional(),
      isSelfEmployed: z.boolean().optional(),
      charitableGiving: z.number().min(0).optional().describe("YTD charitable donations"),
    },
    async (params) => {
      const result = calculateTax({
        taxYear: params.taxYear,
        filingStatus: params.filingStatus,
        grossIncome: params.estimatedIncome,
        capitalGains: params.estimatedCapitalGains,
        capitalGainsLongTerm: true,
        itemizedDeductions: params.estimatedItemizedDeductions,
      });

      const tips: string[] = [];
      const marginalRate = result.marginalRate;

      // 401k/403b
      if (params.hasRetirementPlan) {
        const current = params.currentRetirementContributions ?? 0;
        const limit = params.taxYear >= 2025 ? 23500 : 23000;
        const remaining = Math.max(0, limit - current);
        if (remaining > 0) {
          const taxSavings = Math.round(remaining * marginalRate);
          tips.push(
            `### 💰 Max Out 401(k)/403(b)\n` +
            `You can contribute $${fmt(remaining)} more (limit: $${fmt(limit)}).\n` +
            `Tax savings at your ${(marginalRate * 100).toFixed(0)}% marginal rate: ~$${fmt(taxSavings)}`
          );
        }
      }

      // HSA
      if (params.hasHSA) {
        const current = params.currentHSAContributions ?? 0;
        const limit = params.taxYear >= 2025 ? 4300 : 4150; // individual
        const remaining = Math.max(0, limit - current);
        if (remaining > 0) {
          const taxSavings = Math.round(remaining * marginalRate);
          tips.push(
            `### 🏥 Max Out HSA\n` +
            `You can contribute $${fmt(remaining)} more (individual limit: $${fmt(limit)}).\n` +
            `Triple tax benefit: deductible + tax-free growth + tax-free medical withdrawals.\n` +
            `Tax savings: ~$${fmt(taxSavings)}`
          );
        }
      }

      // Tax-loss harvesting
      if (params.hasCapitalGains && params.hasCapitalLosses) {
        tips.push(
          `### 📉 Tax-Loss Harvesting\n` +
          `Sell losing investments to offset capital gains. Excess losses offset up to $3,000 of ordinary income.\n` +
          `Watch the wash sale rule: don't repurchase substantially identical securities within 30 days.`
        );
      } else if (params.hasCapitalLosses) {
        tips.push(
          `### 📉 Harvest Capital Losses\n` +
          `Even without gains, you can deduct up to $3,000 in capital losses against ordinary income.\n` +
          `Remaining losses carry forward to future years.`
        );
      }

      // Tax-gain harvesting (low income)
      if (params.hasCapitalGains && result.taxableIncome < 47025 && params.filingStatus === "single") {
        tips.push(
          `### 📈 Tax-Gain Harvesting\n` +
          `Your taxable income is in the 0% long-term capital gains bracket.\n` +
          `Consider selling appreciated investments to realize gains tax-free and reset your cost basis.`
        );
      }

      // Charitable bunching
      const charitable = params.charitableGiving ?? 0;
      const stdDeduction = result.deductionAmount;
      if (result.deductionType === "standard" && charitable > 0) {
        tips.push(
          `### 🎁 Charitable Bunching Strategy\n` +
          `You're taking the standard deduction ($${fmt(stdDeduction)}). Consider "bunching" 2 years of donations into one year to exceed the standard deduction threshold.\n` +
          `Donor-Advised Funds (DAFs) make this easy — contribute a lump sum, get the deduction now, distribute to charities over time.`
        );
      }

      // Roth conversion
      if (marginalRate <= 0.22) {
        tips.push(
          `### 🔄 Roth Conversion Opportunity\n` +
          `Your marginal rate is ${(marginalRate * 100).toFixed(0)}% — relatively low.\n` +
          `Consider converting Traditional IRA/401k to Roth to pay tax now at a lower rate.\n` +
          `Fill up the ${(marginalRate * 100).toFixed(0)}% bracket without jumping to the next one.`
        );
      }

      // Self-employed
      if (params.isSelfEmployed) {
        tips.push(
          `### 📋 Self-Employment Deductions\n` +
          `- SEP IRA: contribute up to 25% of net SE income (max $${params.taxYear >= 2025 ? "70,000" : "69,000"})\n` +
          `- Home office deduction (simplified: $5/sq ft, max $1,500)\n` +
          `- Health insurance premiums (100% deductible above-the-line)\n` +
          `- Business expenses: equipment, software, mileage ($0.67/mile TY2024)`
        );
      }

      // Withholding check
      const withheld = params.currentWithholding ?? 0;
      if (withheld > 0) {
        const gap = result.totalFederalTax - withheld;
        if (gap > 1000) {
          tips.push(
            `### ⚠️ Underpayment Warning\n` +
            `Estimated tax: $${fmt(result.totalFederalTax)} | Withheld YTD: $${fmt(withheld)} | Gap: $${fmt(gap)}\n` +
            `Consider making an estimated payment or increasing W-4 withholding to avoid penalties.`
          );
        } else if (gap < -2000) {
          tips.push(
            `### 💡 Over-Withholding\n` +
            `You've withheld $${fmt(Math.abs(gap))} more than needed. Consider adjusting your W-4 to keep more in each paycheck.`
          );
        }
      }

      if (tips.length === 0) {
        tips.push("No specific optimization opportunities identified based on the information provided. Consider consulting a tax professional for personalized advice.");
      }

      const header = [
        `## Year-End Tax Planning — TY${params.taxYear}`,
        `**Estimated Tax**: $${fmt(result.totalFederalTax)} | **Marginal Rate**: ${(marginalRate * 100).toFixed(0)}% | **Effective Rate**: ${(result.effectiveRate * 100).toFixed(2)}%`,
        "",
      ];

      const footer = [
        "",
        `> ⚠️ These are general strategies. Tax situations vary. Consult a qualified tax professional before making decisions.`,
      ];

      return { content: [{ type: "text", text: [...header, ...tips, ...footer].join("\n") }] };
    }
  );

  // --- Tool 2: Multi-year tax comparison ---
  server.tool(
    "compare_tax_years",
    "Compare tax liability across different tax years for the same income. " +
    "Shows how bracket changes and inflation adjustments affect your tax.",
    {
      filingStatus: FilingStatusEnum,
      grossIncome: z.number().min(0).describe("Gross income to compare across years"),
      selfEmploymentIncome: z.number().min(0).optional(),
      dependents: z.number().int().min(0).optional(),
    },
    async (params) => {
      const years = [2024, 2025];
      const results = years.map((year) => {
        try {
          return calculateTax({ ...params, taxYear: year });
        } catch {
          return null;
        }
      });

      const lines = [
        `## Tax Year Comparison — ${params.filingStatus.replace(/_/g, " ")}`,
        `**Gross Income**: $${fmt(params.grossIncome)}`,
        "",
        `| Item | TY2024 | TY2025 | Change |`,
        `|------|--------|--------|--------|`,
      ];

      const r24 = results[0];
      const r25 = results[1];
      if (r24 && r25) {
        const rows: Array<[string, number, number]> = [
          ["Standard Deduction", r24.deductionAmount, r25.deductionAmount],
          ["Taxable Income", r24.taxableIncome, r25.taxableIncome],
          ["Federal Tax", r24.totalFederalTax, r25.totalFederalTax],
        ];
        for (const [label, v24, v25] of rows) {
          const diff = v25 - v24;
          const sign = diff >= 0 ? "+" : "";
          lines.push(`| ${label} | $${fmt(v24)} | $${fmt(v25)} | ${sign}$${fmt(diff)} |`);
        }
        lines.push(
          `| Effective Rate | ${(r24.effectiveRate * 100).toFixed(2)}% | ${(r25.effectiveRate * 100).toFixed(2)}% | ${((r25.effectiveRate - r24.effectiveRate) * 100).toFixed(2)}pp |`
        );
        lines.push(
          `| Marginal Rate | ${(r24.marginalRate * 100).toFixed(0)}% | ${(r25.marginalRate * 100).toFixed(0)}% | — |`
        );

        const savings = r24.totalFederalTax - r25.totalFederalTax;
        if (savings > 0) {
          lines.push("", `💡 TY2025 saves you $${fmt(savings)} due to inflation-adjusted brackets and deductions.`);
        } else if (savings < 0) {
          lines.push("", `📝 TY2025 costs $${fmt(Math.abs(savings))} more.`);
        }
      }

      return { content: [{ type: "text", text: lines.join("\n") }] };
    }
  );

  // --- Tool 3: Self-employment tax estimator ---
  server.tool(
    "estimate_self_employment_tax",
    "Detailed self-employment tax breakdown including Schedule C profit, SE tax, " +
    "QBI deduction, and recommended quarterly payments.",
    {
      taxYear: z.number().describe("Tax year"),
      filingStatus: FilingStatusEnum,
      grossRevenue: z.number().min(0).describe("Total business revenue (Schedule C line 1)"),
      businessExpenses: z.number().min(0).describe("Total business expenses (Schedule C)"),
      otherW2Income: z.number().min(0).optional().describe("W-2 income from other jobs"),
      retirementContributions: z.number().min(0).optional().describe("SEP IRA or Solo 401k contributions"),
      healthInsurancePremiums: z.number().min(0).optional().describe("Self-employed health insurance premiums"),
      dependents: z.number().int().min(0).optional(),
    },
    async (params) => {
      const netProfit = params.grossRevenue - params.businessExpenses;
      const otherIncome = params.otherW2Income ?? 0;
      const retirement = params.retirementContributions ?? 0;
      const healthPremiums = params.healthInsurancePremiums ?? 0;
      const aboveTheLine = retirement + healthPremiums;

      const totalIncome = netProfit + otherIncome;

      const result = calculateTax({
        taxYear: params.taxYear,
        filingStatus: params.filingStatus,
        grossIncome: totalIncome,
        w2Income: otherIncome,
        selfEmploymentIncome: netProfit,
        qualifiedBusinessIncome: netProfit,
        aboveTheLineDeductions: aboveTheLine,
        dependents: params.dependents,
      });

      const seDeductionHalf = result.selfEmploymentTax * 0.5;
      const quarterlyPayment = Math.ceil((result.totalFederalTax) / 4);

      // SEP IRA max
      const sepMax = Math.min(Math.round(netProfit * 0.25), params.taxYear >= 2025 ? 70000 : 69000);

      const lines = [
        `## Self-Employment Tax Breakdown — TY${params.taxYear}`,
        "",
        `### Schedule C Summary`,
        `| Item | Amount |`,
        `|------|--------|`,
        `| Gross Revenue | $${fmt(params.grossRevenue)} |`,
        `| Business Expenses | -$${fmt(params.businessExpenses)} |`,
        `| **Net Profit (Schedule C)** | **$${fmt(netProfit)}** |`,
        otherIncome > 0 ? `| Other W-2 Income | $${fmt(otherIncome)} |` : "",
        `| **Total Income** | **$${fmt(totalIncome)}** |`,
        "",
        `### Tax Breakdown`,
        `| Component | Amount |`,
        `|-----------|--------|`,
        `| Self-Employment Tax (SS + Medicare) | $${fmt(result.selfEmploymentTax)} |`,
        `| SE Tax Deduction (50%) | -$${fmt(Math.round(seDeductionHalf))} |`,
        result.qbiDeduction > 0 ? `| QBI Deduction (20%) | -$${fmt(result.qbiDeduction)} |` : "",
        retirement > 0 ? `| Retirement Deduction | -$${fmt(retirement)} |` : "",
        healthPremiums > 0 ? `| Health Insurance Deduction | -$${fmt(healthPremiums)} |` : "",
        `| Income Tax | $${fmt(result.ordinaryIncomeTax)} |`,
        result.additionalMedicareTax > 0 ? `| Additional Medicare Tax | $${fmt(result.additionalMedicareTax)} |` : "",
        `| **Total Federal Tax** | **$${fmt(result.totalFederalTax)}** |`,
        `| Effective Rate | ${(result.effectiveRate * 100).toFixed(2)}% |`,
        "",
        `### Quarterly Estimated Payments (1040-ES)`,
        `| Quarter | Due Date | Amount |`,
        `|---------|----------|--------|`,
        `| Q1 | Apr 15 | $${fmt(quarterlyPayment)} |`,
        `| Q2 | Jun 15 | $${fmt(quarterlyPayment)} |`,
        `| Q3 | Sep 15 | $${fmt(quarterlyPayment)} |`,
        `| Q4 | Jan 15 | $${fmt(quarterlyPayment)} |`,
        "",
        `### Retirement Contribution Limits`,
        `| Account | Max Contribution |`,
        `|---------|-----------------|`,
        `| SEP IRA | $${fmt(sepMax)} (25% of net profit) |`,
        `| Solo 401(k) Employee | $${fmt(params.taxYear >= 2025 ? 23500 : 23000)} |`,
        `| Solo 401(k) Total | $${fmt(params.taxYear >= 2025 ? 70000 : 69000)} |`,
        "",
        `> ⚠️ Estimate only. Consult a tax professional for your specific situation.`,
      ].filter(Boolean);

      return { content: [{ type: "text", text: lines.join("\n") }] };
    }
  );

  // --- Tool 4: Real estate / mortgage tax tool ---
  server.tool(
    "analyze_mortgage_tax_benefit",
    "Analyze the tax benefit of mortgage interest deduction and property taxes. " +
    "Compares itemizing with mortgage vs taking the standard deduction.",
    {
      taxYear: z.number().describe("Tax year"),
      filingStatus: FilingStatusEnum,
      grossIncome: z.number().min(0),
      mortgageInterest: z.number().min(0).describe("Annual mortgage interest paid"),
      propertyTaxes: z.number().min(0).describe("Annual property taxes paid"),
      stateIncomeTaxes: z.number().min(0).optional().describe("State/local income taxes paid"),
      otherItemized: z.number().min(0).optional().describe("Other itemized deductions (charity, medical, etc.)"),
      mortgageBalance: z.number().min(0).optional().describe("Current mortgage balance"),
      interestRate: z.number().min(0).optional().describe("Mortgage interest rate (e.g., 0.065 for 6.5%)"),
    },
    async (params) => {
      const stateIncome = params.stateIncomeTaxes ?? 0;
      const saltTotal = stateIncome + params.propertyTaxes;
      const saltCapped = Math.min(saltTotal, params.filingStatus === "married_filing_separately" ? 5000 : 10000);
      const otherItemized = params.otherItemized ?? 0;
      const totalItemized = params.mortgageInterest + saltCapped + otherItemized;

      // With itemizing
      const withItemized = calculateTax({
        taxYear: params.taxYear,
        filingStatus: params.filingStatus,
        grossIncome: params.grossIncome,
        itemizedDeductions: totalItemized,
      });

      // With standard deduction
      const withStandard = calculateTax({
        taxYear: params.taxYear,
        filingStatus: params.filingStatus,
        grossIncome: params.grossIncome,
      });

      const savings = withStandard.totalFederalTax - withItemized.totalFederalTax;
      const recommendation = savings > 0 ? "itemize" : "standard";

      const lines = [
        `## Mortgage Tax Benefit Analysis — TY${params.taxYear}`,
        "",
        `### Itemized Deduction Breakdown`,
        `| Deduction | Amount | Notes |`,
        `|-----------|--------|-------|`,
        `| Mortgage Interest | $${fmt(params.mortgageInterest)} | On up to $750K debt |`,
        `| Property Taxes | $${fmt(params.propertyTaxes)} | Part of SALT |`,
        stateIncome > 0 ? `| State Income Taxes | $${fmt(stateIncome)} | Part of SALT |` : "",
        `| SALT (capped) | $${fmt(saltCapped)} | $10K cap ($5K MFS) |`,
        saltTotal > saltCapped ? `| SALT lost to cap | $${fmt(saltTotal - saltCapped)} | Not deductible |` : "",
        otherItemized > 0 ? `| Other Itemized | $${fmt(otherItemized)} | |` : "",
        `| **Total Itemized** | **$${fmt(totalItemized)}** | |`,
        "",
        `### Comparison`,
        `| Scenario | Deduction | Federal Tax | Effective Rate |`,
        `|----------|-----------|-------------|---------------|`,
        `| Standard | $${fmt(withStandard.deductionAmount)} | $${fmt(withStandard.totalFederalTax)} | ${(withStandard.effectiveRate * 100).toFixed(2)}% |`,
        `| Itemized | $${fmt(totalItemized)} | $${fmt(withItemized.totalFederalTax)} | ${(withItemized.effectiveRate * 100).toFixed(2)}% |`,
        "",
        savings > 0
          ? `💡 **Recommendation**: Itemize — saves $${fmt(savings)}/year over standard deduction.`
          : `💡 **Recommendation**: Take the standard deduction — it's $${fmt(Math.abs(savings))} better than itemizing.`,
      ];

      if (params.mortgageBalance && params.interestRate) {
        const monthlyPayment = (params.mortgageBalance * (params.interestRate / 12)) /
          (1 - Math.pow(1 + params.interestRate / 12, -360));
        lines.push(
          "",
          `### Mortgage Info`,
          `| Detail | Value |`,
          `|--------|-------|`,
          `| Balance | $${fmt(params.mortgageBalance)} |`,
          `| Rate | ${(params.interestRate * 100).toFixed(2)}% |`,
          `| Est. Monthly Payment (30yr) | $${fmt(Math.round(monthlyPayment))} |`,
        );
      }

      lines.push(
        "",
        `> ⚠️ Simplified analysis. Does not account for AMT or state-specific rules.`,
      );

      return { content: [{ type: "text", text: lines.filter(Boolean).join("\n") }] };
    }
  );

  // --- Tool 5: Education tax benefits ---
  server.tool(
    "analyze_education_tax_benefits",
    "Compare education tax benefits: AOTC vs Lifetime Learning Credit, " +
    "student loan interest deduction, and 529 plan advantages.",
    {
      filingStatus: FilingStatusEnum,
      agi: z.number().min(0).describe("Adjusted Gross Income"),
      tuitionPaid: z.number().min(0).describe("Tuition and qualified expenses paid"),
      isUndergrad: z.boolean().describe("Is the student in first 4 years of undergrad?"),
      yearsAOTCClaimed: z.number().int().min(0).max(4).optional().describe("Years AOTC already claimed (max 4)"),
      studentLoanInterest: z.number().min(0).optional().describe("Student loan interest paid this year"),
      has529Plan: z.boolean().optional().describe("Contributing to or using a 529 plan"),
      contribution529: z.number().min(0).optional().describe("529 plan contribution this year"),
    },
    async (params) => {
      const lines = [
        `## Education Tax Benefits Analysis`,
        `**AGI**: $${fmt(params.agi)} | **Filing**: ${params.filingStatus.replace(/_/g, " ")}`,
        "",
      ];

      // AOTC analysis
      const aotcYearsUsed = params.yearsAOTCClaimed ?? 0;
      const aotcAvailable = params.isUndergrad && aotcYearsUsed < 4;
      const aotcPhaseout: Record<FilingStatus, [number, number]> = {
        single: [80000, 90000],
        married_filing_jointly: [160000, 180000],
        married_filing_separately: [0, 0], // not eligible
        head_of_household: [80000, 90000],
      };
      const [aotcStart, aotcEnd] = aotcPhaseout[params.filingStatus];

      let aotcCredit = 0;
      let aotcEligible = false;
      if (aotcAvailable && params.agi <= aotcEnd && params.filingStatus !== "married_filing_separately") {
        aotcEligible = true;
        const qualifiedExpenses = Math.min(params.tuitionPaid, 4000);
        aotcCredit = Math.min(2000, qualifiedExpenses) + Math.max(0, qualifiedExpenses - 2000) * 0.25;
        if (params.agi > aotcStart) {
          const reduction = (params.agi - aotcStart) / (aotcEnd - aotcStart);
          aotcCredit = Math.round(aotcCredit * (1 - reduction));
        }
      }

      // LLC analysis
      const llcPhaseout: Record<FilingStatus, [number, number]> = {
        single: [80000, 90000],
        married_filing_jointly: [160000, 180000],
        married_filing_separately: [0, 0],
        head_of_household: [80000, 90000],
      };
      const [llcStart, llcEnd] = llcPhaseout[params.filingStatus];
      let llcCredit = 0;
      let llcEligible = false;
      if (params.agi <= llcEnd && params.filingStatus !== "married_filing_separately") {
        llcEligible = true;
        llcCredit = Math.min(params.tuitionPaid, 10000) * 0.20;
        if (params.agi > llcStart) {
          const reduction = (params.agi - llcStart) / (llcEnd - llcStart);
          llcCredit = Math.round(llcCredit * (1 - reduction));
        }
      }

      lines.push(
        `### Credit Comparison`,
        `| Credit | Amount | Refundable | Eligible |`,
        `|--------|--------|------------|----------|`,
        `| AOTC | $${fmt(Math.round(aotcCredit))} | 40% ($${fmt(Math.round(aotcCredit * 0.4))}) | ${aotcEligible ? "✅" : "❌"} |`,
        `| Lifetime Learning | $${fmt(Math.round(llcCredit))} | No | ${llcEligible ? "✅" : "❌"} |`,
        "",
      );

      const bestCredit = aotcEligible && aotcCredit >= llcCredit ? "AOTC" : llcEligible ? "Lifetime Learning Credit" : "Neither";
      lines.push(`💡 **Best option**: ${bestCredit}`);

      if (aotcEligible && aotcCredit > llcCredit) {
        lines.push(`> AOTC is better: higher credit ($${fmt(Math.round(aotcCredit))} vs $${fmt(Math.round(llcCredit))}), plus 40% is refundable. ${4 - aotcYearsUsed} year(s) of AOTC remaining.`);
      }

      // Student loan interest
      const slInterest = params.studentLoanInterest ?? 0;
      if (slInterest > 0) {
        const slLimit = Math.min(slInterest, 2500);
        const slPhaseout: Record<FilingStatus, [number, number]> = {
          single: [80000, 95000],
          married_filing_jointly: [165000, 195000],
          married_filing_separately: [0, 0],
          head_of_household: [80000, 95000],
        };
        const [slStart, slEnd] = slPhaseout[params.filingStatus];
        let deduction = slLimit;
        if (params.agi > slEnd || params.filingStatus === "married_filing_separately") {
          deduction = 0;
        } else if (params.agi > slStart) {
          deduction = Math.round(slLimit * (1 - (params.agi - slStart) / (slEnd - slStart)));
        }

        lines.push(
          "",
          `### Student Loan Interest Deduction`,
          `| Item | Amount |`,
          `|------|--------|`,
          `| Interest Paid | $${fmt(slInterest)} |`,
          `| Deductible Amount | $${fmt(deduction)} |`,
          deduction < slLimit ? `| Lost to phase-out | $${fmt(slLimit - deduction)} |` : "",
        );
      }

      // 529 plan
      if (params.has529Plan) {
        const contribution = params.contribution529 ?? 0;
        lines.push(
          "",
          `### 529 Plan`,
          `- Contributions are NOT federally deductible (check your state — many offer state tax deductions)`,
          `- Growth is tax-free for qualified education expenses`,
          `- Can be used for tuition, room & board, books, computers`,
          `- K-12 tuition: up to $10,000/year`,
          `- Unused funds: can roll to beneficiary's Roth IRA (up to $35K lifetime, 15+ year account)`,
          contribution > 0 ? `- Your contribution: $${fmt(contribution)} (gift tax exclusion: $${params.filingStatus === "married_filing_jointly" ? "38,000" : "19,000"}/year per beneficiary)` : "",
        );
      }

      lines.push(
        "",
        `> ⚠️ Cannot claim both AOTC and LLC for the same student in the same year. MFS cannot claim education credits.`,
      );

      return { content: [{ type: "text", text: lines.filter(Boolean).join("\n") }] };
    }
  );
}
