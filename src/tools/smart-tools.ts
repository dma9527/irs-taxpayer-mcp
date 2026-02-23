/**
 * Smart MCP tools: tax health check, knowledge base, form guidance.
 * These tools combine multiple calculations into intelligent outputs.
 */

import { z } from "zod";
import { fmt, FilingStatusEnum } from "./shared.js";
import { type McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { calculateTax } from "../calculators/tax-calculator.js";
import { calculateStateTax } from "../calculators/state-tax-calculator.js";
import { calculateEITC } from "../calculators/eitc-calculator.js";
import { getTaxYearData, getSaltCap } from "../data/tax-brackets.js";



export function registerSmartTools(server: McpServer): void {

  // --- Tool 1: Tax Health Check ---
  server.tool(
    "run_tax_health_check",
    "One-click tax health check. Analyzes your full financial picture and outputs a report " +
    "with actionable findings: missed credits, withholding accuracy, deduction optimization, " +
    "audit risk, retirement savings gaps, and year-end planning tips.",
    {
      taxYear: z.number().describe("Tax year"),
      filingStatus: FilingStatusEnum,
      age: z.number().int().min(0).optional(),
      grossIncome: z.number().min(0),
      w2Income: z.number().min(0).optional(),
      selfEmploymentIncome: z.number().min(0).optional(),
      capitalGains: z.number().optional(),
      stateCode: z.string().length(2).optional(),
      dependents: z.number().int().min(0).optional(),
      mortgageInterest: z.number().min(0).optional(),
      stateLocalTaxes: z.number().min(0).optional(),
      charitableDonations: z.number().min(0).optional(),
      retirement401k: z.number().min(0).optional(),
      retirementIRA: z.number().min(0).optional(),
      hsaContributions: z.number().min(0).optional(),
      federalWithheld: z.number().min(0).optional(),
      hasHealthInsurance: z.boolean().optional(),
      isStudent: z.boolean().optional(),
      boughtEV: z.boolean().optional(),
      installedSolar: z.boolean().optional(),
    },
    async (params) => {
      const taxData = getTaxYearData(params.taxYear);
      if (!taxData) return { content: [{ type: "text", text: `Tax year ${params.taxYear} not supported.` }], isError: true };
      if (params.grossIncome <= 0) return { content: [{ type: "text", text: "Income must be greater than zero." }], isError: true };

      const findings: Array<{ emoji: string; title: string; detail: string; savings?: number }> = [];

      // Run core calculation
      const mortgage = params.mortgageInterest ?? 0;
      const saltPaid = params.stateLocalTaxes ?? 0;
      const saltCap = getSaltCap(params.taxYear, params.filingStatus, params.grossIncome);
      const charity = params.charitableDonations ?? 0;
      const totalItemized = mortgage + Math.min(saltPaid, saltCap) + charity;

      const result = calculateTax({
        taxYear: params.taxYear,
        filingStatus: params.filingStatus,
        grossIncome: params.grossIncome,
        w2Income: params.w2Income,
        selfEmploymentIncome: params.selfEmploymentIncome,
        capitalGains: params.capitalGains,
        capitalGainsLongTerm: true,
        itemizedDeductions: totalItemized > 0 ? totalItemized : undefined,
        dependents: params.dependents,
      });

      // 1. Deduction check
      if (result.deductionType === "standard" && totalItemized > 0 && totalItemized > result.deductionAmount * 0.8) {
        findings.push({
          emoji: "💡",
          title: "Close to Itemizing Threshold",
          detail: `Your itemized deductions ($${fmt(totalItemized)}) are ${Math.round(totalItemized / result.deductionAmount * 100)}% of the standard deduction ($${fmt(result.deductionAmount)}). Consider bunching charitable donations or prepaying property taxes to push over the threshold.`,
        });
      }

      // 2. SALT cap impact
      if (saltPaid > saltCap) {
        findings.push({
          emoji: "⚠️",
          title: "SALT Cap Limiting Your Deduction",
          detail: `You paid $${fmt(saltPaid)} in state/local taxes but can only deduct $${fmt(saltCap)} (SALT cap). You're losing $${fmt(saltPaid - saltCap)} in deductions.`,
        });
      }

      // 3. Withholding check
      const withheld = params.federalWithheld ?? 0;
      if (withheld > 0) {
        const diff = withheld - result.totalFederalTax;
        if (diff > 3000) {
          findings.push({
            emoji: "💰",
            title: "Significant Over-Withholding",
            detail: `You've withheld ~$${fmt(diff)} more than needed. Adjust your W-4 to keep ~$${fmt(Math.round(diff / 12))}/month more in your paycheck.`,
            savings: Math.round(diff),
          });
        } else if (diff < -1000) {
          findings.push({
            emoji: "🚨",
            title: "Under-Withholding Warning",
            detail: `You may owe ~$${fmt(Math.abs(diff))} at tax time. Consider increasing W-4 withholding or making an estimated payment to avoid penalties.`,
          });
        }
      }

      // 4. Retirement savings gaps
      const k401 = params.retirement401k ?? 0;
      const k401Limit = params.taxYear >= 2025 ? 23500 : 23000;
      if (k401 > 0 && k401 < k401Limit) {
        const gap = k401Limit - k401;
        const taxSavings = Math.round(gap * result.marginalRate);
        findings.push({
          emoji: "📈",
          title: "401(k) Room Available",
          detail: `You can contribute $${fmt(gap)} more to your 401(k) (limit: $${fmt(k401Limit)}). Tax savings: ~$${fmt(taxSavings)} at your ${(result.marginalRate * 100).toFixed(0)}% marginal rate.`,
          savings: taxSavings,
        });
      }

      const hsa = params.hsaContributions ?? 0;
      const hsaLimit = params.taxYear >= 2025 ? 4300 : 4150;
      if (hsa > 0 && hsa < hsaLimit) {
        const gap = hsaLimit - hsa;
        findings.push({
          emoji: "🏥",
          title: "HSA Room Available",
          detail: `You can contribute $${fmt(gap)} more to your HSA (individual limit: $${fmt(hsaLimit)}). Triple tax advantage.`,
          savings: Math.round(gap * result.marginalRate),
        });
      }

      // 5. Missed credits check
      const earnedIncome = (params.w2Income ?? 0) + (params.selfEmploymentIncome ?? 0);
      const eitc = calculateEITC({
        taxYear: params.taxYear,
        filingStatus: params.filingStatus,
        earnedIncome,
        agi: result.adjustedGrossIncome,
        qualifyingChildren: params.dependents ?? 0,
      });
      if (eitc.eligible && eitc.credit > 0) {
        findings.push({
          emoji: "✅",
          title: "EITC Eligible",
          detail: `You qualify for $${fmt(eitc.credit)} Earned Income Tax Credit. This is fully refundable.`,
          savings: eitc.credit,
        });
      }

      if (params.isStudent) {
        const aotcLimit = params.filingStatus === "married_filing_jointly" ? 180000 : 90000;
        if (result.adjustedGrossIncome <= aotcLimit) {
          findings.push({ emoji: "🎓", title: "Education Credit Available", detail: "You may qualify for AOTC ($2,500) or Lifetime Learning Credit ($2,000). Use `analyze_education_tax_benefits` for details." });
        }
      }

      if (params.boughtEV) {
        findings.push({ emoji: "🚗", title: "EV Credit Available", detail: "You may qualify for up to $7,500 Clean Vehicle Credit. Check income limits and vehicle eligibility." });
      }

      if (params.installedSolar) {
        findings.push({ emoji: "☀️", title: "Solar Credit Available", detail: "Residential Clean Energy Credit: 30% of system cost with no cap. File Form 5695." });
      }

      // 6. Roth conversion opportunity
      if (result.marginalRate <= 0.22 && (params.age ?? 0) < 73) {
        findings.push({
          emoji: "🔄",
          title: "Roth Conversion Opportunity",
          detail: `Your marginal rate is ${(result.marginalRate * 100).toFixed(0)}% — relatively low. Consider converting Traditional IRA to Roth to lock in this rate.`,
        });
      }

      // 7. SE quarterly payments
      if (params.selfEmploymentIncome && params.selfEmploymentIncome > 0 && withheld === 0) {
        findings.push({
          emoji: "📅",
          title: "Quarterly Payments Needed",
          detail: "Self-employment income with no withholding — you likely need to make quarterly estimated payments to avoid penalties.",
        });
      }

      // Score
      const totalSavings = findings.reduce((s, f) => s + (f.savings ?? 0), 0);
      const issueCount = findings.filter((f) => f.emoji === "⚠️" || f.emoji === "🚨").length;
      const opportunityCount = findings.filter((f) => f.savings && f.savings > 0).length;

      const lines = [
        `# 🩺 Tax Health Check — TY${params.taxYear}`,
        `**${params.filingStatus.replace(/_/g, " ")}** | **$${fmt(params.grossIncome)} income** | **${(result.effectiveRate * 100).toFixed(1)}% effective rate**`,
        "",
        `| Metric | Value |`,
        `|--------|-------|`,
        `| Findings | ${findings.length} |`,
        `| Issues to Address | ${issueCount} |`,
        `| Savings Opportunities | ${opportunityCount} |`,
        totalSavings > 0 ? `| **Potential Savings** | **$${fmt(totalSavings)}** |` : "",
        "",
      ];

      if (findings.length === 0) {
        lines.push("✅ **No issues found.** Your tax situation looks well-optimized.");
      } else {
        lines.push("### Findings", "");
        for (const f of findings) {
          lines.push(`#### ${f.emoji} ${f.title}`, f.detail, f.savings ? `> Potential savings: **$${fmt(f.savings)}**` : "", "");
        }
      }

      lines.push(`> Run \`generate_full_tax_report\` for a detailed tax breakdown.`);

      return { content: [{ type: "text", text: lines.filter(Boolean).join("\n") }] };
    }
  );

  // --- Tool 2: Tax Knowledge Base ---
  server.tool(
    "lookup_tax_rule",
    "Look up IRS tax rules, definitions, and common questions. " +
    "Covers filing rules, income types, deduction rules, credit eligibility, " +
    "stock options, wash sales, and more.",
    {
      topic: z.string().describe("Tax topic to look up (e.g., 'wash sale rule', 'ISO vs NSO', 'AOTC and LLC same year', 'gift tax', 'estimated tax penalty')"),
    },
    async ({ topic }) => {
      const key = topic.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();

      interface KBEntry { title: string; answer: string; irsRef?: string }

      const kb: Record<string, KBEntry> = {
        "wash sale": {
          title: "Wash Sale Rule",
          answer: `The wash sale rule (IRC §1091) prevents you from claiming a tax loss if you buy a "substantially identical" security within 30 days before or after the sale.\n\n**Key points:**\n- Applies to stocks, bonds, options, and mutual funds\n- 30-day window applies both before AND after the sale (61-day total window)\n- Applies across ALL your accounts (including spouse's)\n- Disallowed loss is added to the cost basis of the replacement shares\n- Does NOT apply to gains — only losses\n\n**What counts as "substantially identical":**\n- Same stock or bond: yes\n- Same company's stock vs options: yes\n- S&P 500 index fund from Vanguard vs Fidelity: debatable (IRS hasn't ruled definitively)\n- S&P 500 fund vs Total Market fund: generally not identical`,
          irsRef: "IRC §1091, IRS Publication 550",
        },
        "iso vs nso": {
          title: "ISO vs NSO Stock Options",
          answer: `**Incentive Stock Options (ISO):**\n- No ordinary income tax at exercise (but AMT may apply on the spread)\n- If held 1+ year after exercise AND 2+ years after grant: long-term capital gains on sale\n- Disqualifying disposition: taxed as ordinary income\n- $100K annual vesting limit\n\n**Non-Qualified Stock Options (NSO):**\n- Spread at exercise is ordinary income (W-2 income, subject to withholding)\n- Subsequent gain/loss is capital gain/loss\n- No AMT implications\n- No holding period requirements for favorable treatment\n\n**Which is better?** ISOs are better if you can hold for the qualifying period and your AMT exposure is manageable. NSOs are simpler and more predictable.`,
          irsRef: "IRC §422 (ISO), IRC §83 (NSO)",
        },
        "aotc and llc": {
          title: "Can I Claim Both AOTC and LLC?",
          answer: `**No** — you cannot claim both the American Opportunity Tax Credit (AOTC) and the Lifetime Learning Credit (LLC) for the **same student** in the **same year**.\n\nHowever:\n- You CAN claim AOTC for one student and LLC for a different student\n- AOTC is usually better: up to $2,500 (40% refundable) vs LLC $2,000 (non-refundable)\n- AOTC is limited to first 4 years of undergrad; LLC has no limit\n- Neither credit is available for Married Filing Separately`,
          irsRef: "IRC §25A, IRS Publication 970",
        },
        "gift tax": {
          title: "Gift Tax Rules",
          answer: `**Annual exclusion (TY2024):** $18,000 per recipient ($19,000 for TY2025)\n**Annual exclusion MFJ:** $36,000 per recipient (gift splitting)\n**Lifetime exemption:** $13.61M (TY2024), $15M+ (TY2026+ per OBBB)\n\n**Key points:**\n- Gifts below the annual exclusion require no reporting\n- Gifts above the annual exclusion require Form 709 but usually no tax (uses lifetime exemption)\n- Gifts to spouse (US citizen): unlimited, no tax\n- Gifts for tuition/medical paid directly to institution: unlimited, no tax\n- The recipient does NOT pay tax on gifts received\n- Cost basis for gifted assets: donor's basis (carryover basis)`,
          irsRef: "IRC §2503, IRS Form 709",
        },
        "estimated tax penalty": {
          title: "Estimated Tax Penalty (Underpayment)",
          answer: `**Safe harbor rules** — you avoid the penalty if you pay at least:\n- 90% of current year tax, OR\n- 100% of prior year tax (110% if prior year AGI > $150K)\n\n**Penalty rate:** IRS charges interest at the federal short-term rate + 3% (currently ~8%)\n\n**Who must pay estimated taxes:**\n- Self-employed with expected tax liability > $1,000\n- Anyone without sufficient withholding\n\n**Due dates:** Apr 15, Jun 15, Sep 15, Jan 15\n\n**How to avoid:** Increase W-4 withholding (counts as paid evenly throughout year) or make quarterly payments via IRS Direct Pay.`,
          irsRef: "IRC §6654, Form 2210",
        },
        "roth conversion": {
          title: "Roth IRA Conversion Rules",
          answer: `**What:** Move money from Traditional IRA/401k to Roth IRA. Pay tax now, grow tax-free forever.\n\n**Key rules:**\n- No income limit for conversions (unlike direct Roth contributions)\n- Converted amount is taxable as ordinary income in the year of conversion\n- 5-year rule: each conversion has its own 5-year clock for penalty-free withdrawal\n- Pro-rata rule: if you have pre-tax IRA balances, conversion is partially taxable\n- No 10% early withdrawal penalty on conversions (but earnings before 59½ may be penalized)\n- Cannot "undo" a conversion (recharacterization eliminated by TCJA)\n\n**Best time to convert:** Low-income years, early retirement before RMDs, or when you expect higher future tax rates.`,
          irsRef: "IRC §408A, IRS Publication 590-A",
        },
        "social security tax": {
          title: "When Is Social Security Income Taxable?",
          answer: `**Up to 85% of Social Security benefits may be taxable** depending on your "combined income" (AGI + nontaxable interest + 50% of SS benefits).\n\n**Single filers:**\n- Combined income < $25,000: 0% taxable\n- $25,000-$34,000: up to 50% taxable\n- > $34,000: up to 85% taxable\n\n**MFJ:**\n- Combined income < $32,000: 0% taxable\n- $32,000-$44,000: up to 50% taxable\n- > $44,000: up to 85% taxable\n\n**Strategies to reduce:** Roth conversions before claiming SS, municipal bond interest, managing withdrawal timing.`,
          irsRef: "IRC §86, IRS Publication 915",
        },
        "home sale exclusion": {
          title: "Home Sale Capital Gains Exclusion",
          answer: `**Exclude up to $250,000 (single) or $500,000 (MFJ) of gain** from the sale of your primary residence.\n\n**Requirements:**\n- Owned the home for at least 2 of the last 5 years\n- Used as primary residence for at least 2 of the last 5 years\n- Haven't used the exclusion in the past 2 years\n\n**Partial exclusion:** Available if you moved due to job change, health, or unforeseen circumstances.\n\n**What's NOT excluded:** Depreciation recapture if you used part of the home for business.`,
          irsRef: "IRC §121",
        },
        "dependent rules": {
          title: "Who Qualifies as a Dependent?",
          answer: `**Qualifying Child:**\n- Under age 19 (or under 24 if full-time student)\n- Lived with you more than half the year\n- Did not provide more than half their own support\n- Must have SSN for CTC\n\n**Qualifying Relative:**\n- Gross income < $5,050 (TY2024)\n- You provide more than half their support\n- Not a qualifying child of another taxpayer\n- Can be any age\n\n**Both types:** Must be US citizen/resident, cannot file joint return (with exceptions), cannot be claimed by someone else.`,
          irsRef: "IRC §152, IRS Publication 501",
        },
        "capital loss": {
          title: "Capital Loss Deduction Rules",
          answer: `**Offset rules:**\n1. Short-term losses offset short-term gains first\n2. Long-term losses offset long-term gains first\n3. Net losses of one type offset net gains of the other\n4. Up to $3,000/year ($1,500 MFS) of net capital losses deduct against ordinary income\n5. Excess losses carry forward indefinitely\n\n**Key points:**\n- No limit on offsetting capital gains with capital losses\n- The $3,000 limit only applies to the excess over gains\n- Carried-forward losses retain their character (ST or LT)\n- Wash sale rule may disallow losses (see wash sale topic)`,
          irsRef: "IRC §1211, §1212",
        },
      };

      // Fuzzy match
      let match: KBEntry | undefined;
      for (const [k, v] of Object.entries(kb)) {
        if (key.includes(k) || k.includes(key)) {
          match = v;
          break;
        }
      }

      // Try partial word matching
      if (!match) {
        const words = key.split(" ");
        for (const [k, v] of Object.entries(kb)) {
          if (words.some((w) => w.length > 3 && k.includes(w))) {
            match = v;
            break;
          }
        }
      }

      if (!match) {
        const topics = Object.values(kb).map((v) => `- ${v.title}`).join("\n");
        return {
          content: [{
            type: "text",
            text: `## Topic Not Found: "${topic}"\n\nAvailable topics:\n${topics}\n\nTry a different search term, or ask your AI assistant directly for tax guidance.`,
          }],
        };
      }

      const lines = [
        `## ${match.title}`,
        "",
        match.answer,
        "",
        match.irsRef ? `📖 **IRS Reference**: ${match.irsRef}` : "",
        "",
        `> ⚠️ Tax rules are complex and change frequently. This is a simplified summary. Consult a tax professional for your specific situation.`,
      ];

      return { content: [{ type: "text", text: lines.filter(Boolean).join("\n") }] };
    }
  );

  // --- Tool 3: Form Filing Guide ---
  server.tool(
    "get_form_filing_guide",
    "Step-by-step guide for filling out a specific IRS form or schedule. " +
    "Explains each section, what data you need, and common mistakes to avoid.",
    {
      formNumber: z.string().describe("IRS form (e.g., '1040', 'Schedule C', 'Schedule D', 'Form 8949', 'W-4')"),
    },
    async ({ formNumber }) => {
      const key = formNumber.toUpperCase().replace(/FORM\s*/i, "").replace(/SCHEDULE\s*/i, "SCH ").trim();

      interface FormGuide {
        title: string;
        purpose: string;
        sections: Array<{ name: string; lines: string; what: string; source: string }>;
        tips: string[];
        commonMistakes: string[];
      }

      const guides: Record<string, FormGuide> = {
        "1040": {
          title: "Form 1040 — U.S. Individual Income Tax Return",
          purpose: "Main federal tax return for all individual taxpayers",
          sections: [
            { name: "Filing Status", lines: "Top", what: "Check one: Single, MFJ, MFS, HoH, QSS", source: "Your marital status as of Dec 31" },
            { name: "Income", lines: "1-8", what: "Wages (W-2 Box 1), interest, dividends, capital gains, other income", source: "W-2s, 1099s, Schedule D" },
            { name: "Adjustments", lines: "9-10", what: "Above-the-line deductions: HSA, student loan interest, SE tax deduction", source: "Schedule 1" },
            { name: "AGI", lines: "11", what: "Adjusted Gross Income = Total Income - Adjustments", source: "Calculated" },
            { name: "Deductions", lines: "12-13", what: "Standard deduction OR itemized (Schedule A)", source: "Schedule A or standard amount" },
            { name: "Taxable Income", lines: "15", what: "AGI minus deductions and QBI deduction", source: "Calculated" },
            { name: "Tax", lines: "16", what: "Tax from tax table or Schedule D worksheet", source: "Tax tables, Schedule D" },
            { name: "Credits", lines: "19-21", what: "CTC, education credits, other credits", source: "Schedule 3, Form 8812" },
            { name: "Other Taxes", lines: "23", what: "SE tax, AMT, household employment tax", source: "Schedule 2" },
            { name: "Payments", lines: "24-33", what: "Withholding, estimated payments, credits applied", source: "W-2 Box 2, 1099s, 1040-ES records" },
            { name: "Refund/Amount Owed", lines: "34-37", what: "Refund amount or balance due", source: "Calculated" },
          ],
          tips: [
            "E-file for fastest processing (21 days vs 6+ weeks for paper)",
            "Direct deposit refund is fastest — enter routing and account number",
            "Sign and date the return (both spouses for MFJ)",
          ],
          commonMistakes: [
            "Wrong SSN or misspelled name",
            "Forgetting to sign the return",
            "Using wrong filing status",
            "Not reporting all income (IRS has copies of your W-2s and 1099s)",
            "Math errors (e-filing eliminates most of these)",
          ],
        },
        "SCH C": {
          title: "Schedule C — Profit or Loss from Business",
          purpose: "Report income and expenses from sole proprietorship or single-member LLC",
          sections: [
            { name: "Business Info", lines: "A-J", what: "Business name, EIN, business code, accounting method", source: "Your business records" },
            { name: "Gross Income", lines: "1-7", what: "Gross receipts, returns, cost of goods sold", source: "1099-NECs, invoices, sales records" },
            { name: "Expenses", lines: "8-27", what: "Advertising, car, insurance, office, supplies, travel, meals, etc.", source: "Receipts, bank statements, mileage log" },
            { name: "Net Profit/Loss", lines: "28-31", what: "Gross income minus total expenses", source: "Calculated" },
            { name: "Home Office", lines: "30", what: "Business use of home deduction", source: "Form 8829 or simplified method ($5/sq ft, max $1,500)" },
          ],
          tips: [
            "Keep a separate business bank account",
            "Track mileage with an app (standard rate: $0.67/mile TY2024, $0.70/mile TY2025)",
            "Meals are 50% deductible (must be business-related with documentation)",
            "Consider the simplified home office method ($5/sq ft) to avoid Form 8829",
          ],
          commonMistakes: [
            "Not reporting all 1099-NEC income (IRS gets copies)",
            "Deducting personal expenses as business expenses",
            "No mileage log for vehicle deduction",
            "Forgetting to pay quarterly estimated taxes",
            "Not deducting health insurance premiums (above-the-line for SE)",
          ],
        },
        "SCH D": {
          title: "Schedule D — Capital Gains and Losses",
          purpose: "Report sales of stocks, bonds, real estate, and other capital assets",
          sections: [
            { name: "Short-Term", lines: "Part I (1-7)", what: "Assets held 1 year or less", source: "Form 8949 Part I, 1099-B" },
            { name: "Long-Term", lines: "Part II (8-14)", what: "Assets held more than 1 year", source: "Form 8949 Part II, 1099-B" },
            { name: "Summary", lines: "Part III (15-21)", what: "Net gain/loss, 28% rate gain, unrecaptured §1250", source: "Calculated from Parts I and II" },
          ],
          tips: [
            "Most brokerages report cost basis on 1099-B — verify it's correct",
            "Long-term gains get preferential rates (0%/15%/20%)",
            "Net capital losses: deduct up to $3,000/year against ordinary income",
            "Excess losses carry forward to future years indefinitely",
          ],
          commonMistakes: [
            "Not reporting sales where cost basis wasn't reported to IRS",
            "Forgetting wash sale adjustments",
            "Using wrong holding period (check trade date, not settlement date)",
            "Not matching 1099-B amounts exactly (triggers IRS notice)",
          ],
        },
        "SCH A": {
          title: "Schedule A — Itemized Deductions",
          purpose: "Claim itemized deductions instead of the standard deduction",
          sections: [
            { name: "Medical", lines: "1-4", what: "Unreimbursed medical/dental expenses exceeding 7.5% of AGI", source: "Medical bills, insurance statements" },
            { name: "Taxes", lines: "5-7", what: "State/local income or sales tax + property tax (SALT, capped)", source: "State return, property tax bills, W-2 Box 17" },
            { name: "Interest", lines: "8-10", what: "Mortgage interest, investment interest", source: "Form 1098, broker statements" },
            { name: "Charity", lines: "11-14", what: "Cash and non-cash charitable contributions", source: "Donation receipts, acknowledgment letters" },
            { name: "Other", lines: "15-17", what: "Casualty/theft losses (federally declared disasters only), other", source: "Form 4684" },
          ],
          tips: [
            "Only itemize if total exceeds your standard deduction",
            "SALT cap: $10K (TY2024), $40K (TY2025 per OBBB) — includes state income + property tax",
            "Charitable: need written acknowledgment for donations $250+",
            "Non-cash donations over $500 require Form 8283",
          ],
          commonMistakes: [
            "Exceeding SALT cap without realizing it",
            "No documentation for charitable donations",
            "Including employer-reimbursed medical expenses",
            "Deducting mortgage interest on debt over $750K limit",
          ],
        },
        "W-4": {
          title: "Form W-4 — Employee's Withholding Certificate",
          purpose: "Tell your employer how much federal tax to withhold from your paycheck",
          sections: [
            { name: "Step 1", lines: "(a)-(c)", what: "Name, SSN, filing status", source: "Your personal info" },
            { name: "Step 2", lines: "Multiple Jobs", what: "Check box if you or spouse have multiple jobs", source: "Your employment situation" },
            { name: "Step 3", lines: "Dependents", what: "Multiply qualifying children × $2,000 (TY2024) or $2,200 (TY2025)", source: "Number of qualifying children" },
            { name: "Step 4(a)", lines: "Other Income", what: "Income not from jobs (interest, dividends, retirement)", source: "Prior year 1099s as estimate" },
            { name: "Step 4(b)", lines: "Deductions", what: "Excess of itemized over standard deduction", source: "Prior year Schedule A" },
            { name: "Step 4(c)", lines: "Extra Withholding", what: "Additional amount to withhold per paycheck", source: "Use `calculate_w4_withholding` tool" },
          ],
          tips: [
            "Submit a new W-4 when: starting a new job, getting married/divorced, having a child",
            "Use the `calculate_w4_withholding` tool to determine the right settings",
            "Changes take effect within 1-2 pay periods",
            "You can submit a new W-4 anytime — no limit on changes",
          ],
          commonMistakes: [
            "Not updating after major life changes",
            "Both spouses claiming dependents (only one should)",
            "Forgetting Step 2 when both spouses work (leads to under-withholding)",
          ],
        },
      };

      const guide = guides[key];
      if (!guide) {
        const available = Object.values(guides).map((g) => `- ${g.title}`).join("\n");
        return {
          content: [{
            type: "text",
            text: `## Form "${formNumber}" Guide Not Available\n\nAvailable guides:\n${available}\n\nFor form descriptions, use \`get_irs_form_info\`.`,
          }],
        };
      }

      const lines = [
        `## 📝 ${guide.title}`,
        `**Purpose**: ${guide.purpose}`,
        "",
        `### Section-by-Section Guide`,
        "",
        `| Section | Lines | What to Enter | Data Source |`,
        `|---------|-------|---------------|-------------|`,
        ...guide.sections.map((s) => `| ${s.name} | ${s.lines} | ${s.what} | ${s.source} |`),
        "",
        `### 💡 Tips`,
        ...guide.tips.map((t) => `- ${t}`),
        "",
        `### ❌ Common Mistakes`,
        ...guide.commonMistakes.map((m) => `- ${m}`),
        "",
        `> For detailed calculations, use the relevant tax tools (e.g., \`calculate_federal_tax\`, \`standard_vs_itemized\`).`,
      ];

      return { content: [{ type: "text", text: lines.join("\n") }] };
    }
  );
}
