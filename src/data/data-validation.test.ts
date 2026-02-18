/**
 * Automated data validation tests.
 * Cross-checks tax data against known IRS-published values.
 * These serve as a regression guard when updating data for new tax years.
 *
 * Reference: IRS Revenue Procedure 2023-34 (TY2024), Rev. Proc. 2024-40 (TY2025)
 */

import { describe, it, expect } from "vitest";
import { TAX_DATA } from "./tax-brackets.js";
import { TAX_DEADLINES } from "./deadlines.js";
import { ITEMIZED_DEDUCTIONS, ABOVE_THE_LINE_DEDUCTIONS } from "./deductions.js";
import { TAX_CREDITS } from "./credits.js";
import { STATE_TAX_DATA } from "./state-taxes.js";
import { RETIREMENT_ACCOUNTS, RETIREMENT_STRATEGIES } from "./retirement-strategies.js";

describe("IRS data cross-validation — TY2024", () => {
  const d = TAX_DATA[2024];

  it("single 10% bracket ends at $11,600 (Rev. Proc. 2023-34 Table 1)", () => {
    expect(d.brackets.single[0].max).toBe(11600);
  });

  it("single top bracket starts at $609,350", () => {
    expect(d.brackets.single[6].min).toBe(609350);
  });

  it("MFJ standard deduction is $29,200", () => {
    expect(d.standardDeduction.married_filing_jointly).toBe(29200);
  });

  it("single standard deduction is $14,600", () => {
    expect(d.standardDeduction.single).toBe(14600);
  });

  it("SS wage base is $168,600 (SSA)", () => {
    expect(d.socialSecurity.wageBase).toBe(168600);
  });

  it("CTC is $2,000 per child (IRC §24)", () => {
    expect(d.childTaxCredit.amount).toBe(2000);
  });

  it("CTC MFJ phaseout starts at $400,000", () => {
    expect(d.childTaxCredit.phaseoutStart.married_filing_jointly).toBe(400000);
  });

  it("AMT exemption single is $85,700", () => {
    expect(d.amt.exemption.single).toBe(85700);
  });

  it("AMT exemption MFJ is $133,300", () => {
    expect(d.amt.exemption.married_filing_jointly).toBe(133300);
  });

  it("0% CG threshold single is $47,025", () => {
    expect(d.capitalGainsBrackets.single[0].threshold).toBe(47025);
  });
});

describe("IRS data cross-validation — TY2025", () => {
  const d = TAX_DATA[2025];

  it("single 10% bracket ends at $11,925 (Rev. Proc. 2024-40)", () => {
    expect(d.brackets.single[0].max).toBe(11925);
  });

  it("single standard deduction is $15,750 (OBBB)", () => {
    expect(d.standardDeduction.single).toBe(15750);
  });

  it("MFJ standard deduction is $31,500 (OBBB)", () => {
    expect(d.standardDeduction.married_filing_jointly).toBe(31500);
  });

  it("SS wage base is $176,100", () => {
    expect(d.socialSecurity.wageBase).toBe(176100);
  });

  it("AMT exemption single is $88,100", () => {
    expect(d.amt.exemption.single).toBe(88100);
  });

  it("AMT exemption MFJ is $137,000", () => {
    expect(d.amt.exemption.married_filing_jointly).toBe(137000);
  });

  it("CTC is $2,200 per child (OBBB)", () => {
    expect(d.childTaxCredit.amount).toBe(2200);
  });

  it("SALT enhanced cap is $40,000 (OBBB)", () => {
    expect(d.saltCap.enhancedCap).toBe(40000);
    expect(d.saltCap.enhancedAgiThreshold).toBe(500000);
  });

  it("has OBBB deductions (senior, tips, overtime, auto)", () => {
    expect(d.obbbDeductions).toBeDefined();
    expect(d.obbbDeductions!.seniorBonus.amount).toBe(6000);
    expect(d.obbbDeductions!.tipsDeduction.max).toBe(25000);
    expect(d.obbbDeductions!.overtimeDeduction.maxSingle).toBe(12500);
    expect(d.obbbDeductions!.autoLoanInterest.max).toBe(10000);
  });
});

describe("data completeness checks", () => {
  it("has deadlines for TY2024 and TY2025", () => {
    expect(Object.keys(TAX_DEADLINES)).toContain("2024");
    expect(Object.keys(TAX_DEADLINES)).toContain("2025");
  });

  it("TY2024 has at least 8 deadline entries", () => {
    expect(TAX_DEADLINES[2024].length).toBeGreaterThanOrEqual(8);
  });

  it("has at least 15 tax credits", () => {
    expect(TAX_CREDITS.length).toBeGreaterThanOrEqual(15);
  });

  it("has at least 5 itemized deductions", () => {
    expect(ITEMIZED_DEDUCTIONS.length).toBeGreaterThanOrEqual(5);
  });

  it("has at least 4 above-the-line deductions", () => {
    expect(ABOVE_THE_LINE_DEDUCTIONS.length).toBeGreaterThanOrEqual(4);
  });

  it("has 51 state entries (50 + DC)", () => {
    expect(Object.keys(STATE_TAX_DATA).length).toBe(51);
  });

  it("has at least 6 retirement accounts", () => {
    expect(RETIREMENT_ACCOUNTS.length).toBeGreaterThanOrEqual(6);
  });

  it("has at least 4 retirement strategies", () => {
    expect(RETIREMENT_STRATEGIES.length).toBeGreaterThanOrEqual(4);
  });

  it("all credits have required fields", () => {
    for (const credit of TAX_CREDITS) {
      expect(credit.id).toBeTruthy();
      expect(credit.name).toBeTruthy();
      expect(credit.description).toBeTruthy();
      expect(credit.maxAmount).toBeTruthy();
      expect(credit.form).toBeTruthy();
      expect(["full", "partial", "no"]).toContain(credit.refundable);
    }
  });

  it("all deadlines have date and description", () => {
    for (const year of Object.values(TAX_DEADLINES)) {
      for (const deadline of year) {
        expect(deadline.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(deadline.description).toBeTruthy();
      }
    }
  });
});
