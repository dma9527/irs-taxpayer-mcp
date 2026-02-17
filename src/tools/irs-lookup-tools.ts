/**
 * MCP tools for IRS public data lookups.
 * These fetch from IRS public endpoints only — no authentication needed, no PII involved.
 */

import { z } from "zod";
import { type McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { TAX_DEADLINES } from "../data/deadlines.js";
import { SUPPORTED_TAX_YEARS, LATEST_TAX_YEAR } from "../data/tax-brackets.js";

export function registerIrsLookupTools(server: McpServer): void {
  server.tool(
    "get_tax_deadlines",
    "Get important IRS tax deadlines and due dates for a given tax year.",
    {
      taxYear: z.number().optional().describe(`Tax year (default: ${LATEST_TAX_YEAR})`),
    },
    async ({ taxYear }) => {
      const year = taxYear ?? LATEST_TAX_YEAR;
      const deadlines = TAX_DEADLINES[year];

      if (!deadlines) {
        return {
          content: [{
            type: "text",
            text: `No deadline data for TY${year}. Available: ${Object.keys(TAX_DEADLINES).join(", ")}`,
          }],
          isError: true,
        };
      }

      const today = new Date().toISOString().split("T")[0];
      const lines = [
        `## IRS Key Deadlines — TY${year}`,
        "",
        `| Date | Description | Form | Status |`,
        `|------|------------|------|--------|`,
        ...deadlines.map((d) => {
          const isPast = d.date < today;
          const status = isPast ? "✅ Past" : "⏳ Upcoming";
          const form = d.form ?? "—";
          const notes = d.notes ? ` *(${d.notes})*` : "";
          return `| ${d.date} | ${d.description}${notes} | ${form} | ${status} |`;
        }),
      ];

      return { content: [{ type: "text", text: lines.join("\n") }] };
    }
  );

  server.tool(
    "check_refund_status",
    "Provide instructions on how to check IRS refund status. " +
    "This tool does NOT access your IRS account — it provides the official links and requirements.",
    {
      filedElectronically: z.boolean().optional().describe("Whether the return was e-filed"),
    },
    async ({ filedElectronically }) => {
      const efiled = filedElectronically ?? true;
      const waitTime = efiled
        ? "21 days after e-filing"
        : "6 weeks after mailing your paper return";

      const lines = [
        `## How to Check Your IRS Refund Status`,
        "",
        `### Online: "Where's My Refund?"`,
        `🔗 https://www.irs.gov/refunds`,
        "",
        `**What you need:**`,
        `1. Social Security Number (SSN) or ITIN`,
        `2. Filing status`,
        `3. Exact refund amount from your return`,
        "",
        `**When to check:** Refund info is typically available ${waitTime}.`,
        "",
        `### By Phone`,
        `📞 1-800-829-1954 (automated refund hotline)`,
        `📞 1-800-829-1040 (IRS general line)`,
        "",
        `### IRS2Go Mobile App`,
        `Available on iOS and Android — same info as the website.`,
        "",
        `### Common Refund Delays`,
        `- Earned Income Tax Credit (EITC) or Additional Child Tax Credit: refunds held until mid-February`,
        `- Identity verification needed (Letter 5071C)`,
        `- Errors on return`,
        `- Incomplete information`,
        "",
        `> ⚠️ This tool provides guidance only. It does not access your IRS account or any personal tax data.`,
      ];

      return { content: [{ type: "text", text: lines.join("\n") }] };
    }
  );

  server.tool(
    "get_irs_form_info",
    "Get information about common IRS tax forms — what they are, who needs them, and where to find them.",
    {
      formNumber: z.string().describe("IRS form number (e.g., '1040', 'W-2', '1099-NEC', 'Schedule C')"),
    },
    async ({ formNumber }) => {
      const form = IRS_FORMS[formNumber.toUpperCase()] ?? IRS_FORMS[formNumber.toLowerCase()];

      if (!form) {
        const available = Object.keys(IRS_FORMS).join(", ");
        return {
          content: [{
            type: "text",
            text: `Form "${formNumber}" not found in database. Available forms: ${available}\n\nYou can search for any IRS form at: https://www.irs.gov/forms-instructions`,
          }],
        };
      }

      const lines = [
        `## IRS Form ${form.number}: ${form.name}`,
        "",
        `**Purpose**: ${form.purpose}`,
        `**Who files**: ${form.whoFiles}`,
        `**Due date**: ${form.dueDate}`,
        "",
        form.relatedForms ? `**Related forms**: ${form.relatedForms}` : "",
        "",
        `🔗 Download: https://www.irs.gov/forms-pubs/about-form-${form.number.toLowerCase().replace(/ /g, "-")}`,
      ].filter(Boolean);

      return { content: [{ type: "text", text: lines.join("\n") }] };
    }
  );
}

interface FormInfo {
  number: string;
  name: string;
  purpose: string;
  whoFiles: string;
  dueDate: string;
  relatedForms?: string;
}

const IRS_FORMS: Record<string, FormInfo> = {
  "1040": {
    number: "1040",
    name: "U.S. Individual Income Tax Return",
    purpose: "Main form for filing individual federal income tax",
    whoFiles: "All U.S. citizens and residents with income above filing thresholds",
    dueDate: "April 15 (or next business day)",
    relatedForms: "Schedule 1, 2, 3, A, B, C, D, E, SE",
  },
  "W-2": {
    number: "W-2",
    name: "Wage and Tax Statement",
    purpose: "Reports wages paid and taxes withheld by employer",
    whoFiles: "Issued by employers to employees",
    dueDate: "Employers must send by January 31",
  },
  "W-4": {
    number: "W-4",
    name: "Employee's Withholding Certificate",
    purpose: "Tells employer how much federal tax to withhold from paycheck",
    whoFiles: "Employees give to their employer",
    dueDate: "When starting a new job or when circumstances change",
  },
  "1099-NEC": {
    number: "1099-NEC",
    name: "Nonemployee Compensation",
    purpose: "Reports payments of $600+ to independent contractors",
    whoFiles: "Businesses that paid contractors; contractors report this income",
    dueDate: "Payers must send by January 31",
    relatedForms: "Schedule C, Schedule SE",
  },
  "1099-INT": {
    number: "1099-INT",
    name: "Interest Income",
    purpose: "Reports interest income of $10+ from banks and financial institutions",
    whoFiles: "Issued by banks/financial institutions",
    dueDate: "Must be sent by January 31",
    relatedForms: "Schedule B",
  },
  "1099-DIV": {
    number: "1099-DIV",
    name: "Dividends and Distributions",
    purpose: "Reports dividend income and capital gain distributions",
    whoFiles: "Issued by brokerages and mutual funds",
    dueDate: "Must be sent by January 31",
    relatedForms: "Schedule B, Schedule D",
  },
  "1099-MISC": {
    number: "1099-MISC",
    name: "Miscellaneous Information",
    purpose: "Reports rents, royalties, prizes, awards, and other miscellaneous income",
    whoFiles: "Payers of miscellaneous income",
    dueDate: "Must be sent by January 31 (February 15 for some)",
  },
  "SCHEDULE A": {
    number: "Schedule A",
    name: "Itemized Deductions",
    purpose: "Used to claim itemized deductions instead of standard deduction",
    whoFiles: "Taxpayers whose itemized deductions exceed the standard deduction",
    dueDate: "Filed with Form 1040",
  },
  "SCHEDULE C": {
    number: "Schedule C",
    name: "Profit or Loss from Business",
    purpose: "Reports income and expenses from sole proprietorship or single-member LLC",
    whoFiles: "Self-employed individuals and sole proprietors",
    dueDate: "Filed with Form 1040",
    relatedForms: "Schedule SE, Form 1099-NEC",
  },
  "SCHEDULE D": {
    number: "Schedule D",
    name: "Capital Gains and Losses",
    purpose: "Reports sales of stocks, bonds, real estate, and other capital assets",
    whoFiles: "Taxpayers who sold capital assets during the year",
    dueDate: "Filed with Form 1040",
    relatedForms: "Form 8949",
  },
  "SCHEDULE SE": {
    number: "Schedule SE",
    name: "Self-Employment Tax",
    purpose: "Calculates Social Security and Medicare tax for self-employed individuals",
    whoFiles: "Self-employed with net earnings of $400+",
    dueDate: "Filed with Form 1040",
    relatedForms: "Schedule C",
  },
  "1040-ES": {
    number: "1040-ES",
    name: "Estimated Tax for Individuals",
    purpose: "Worksheet and vouchers for making quarterly estimated tax payments",
    whoFiles: "Self-employed, freelancers, and others without sufficient withholding",
    dueDate: "Quarterly: Apr 15, Jun 15, Sep 15, Jan 15",
  },
  "4868": {
    number: "4868",
    name: "Application for Automatic Extension of Time to File",
    purpose: "Grants 6-month extension to file (not to pay)",
    whoFiles: "Any taxpayer who needs more time to file",
    dueDate: "Must be filed by April 15",
  },
};
