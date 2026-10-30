import { describe, expect, it } from "vitest";
import { calculateEITC } from "./eitc-calculator.js";

interface EITCMaximumCase {
  children: number;
  earnedIncome: number;
  expectedCredit: number;
}

const ty2024MaximumCases: EITCMaximumCase[] = [
  { children: 0, earnedIncome: 8260, expectedCredit: 632 },
  { children: 1, earnedIncome: 12390, expectedCredit: 4213 },
  { children: 2, earnedIncome: 17400, expectedCredit: 6960 },
  { children: 3, earnedIncome: 17400, expectedCredit: 7830 },
];

const ty2025MaximumCases: EITCMaximumCase[] = [
  { children: 0, earnedIncome: 8490, expectedCredit: 649 },
  { children: 1, earnedIncome: 12730, expectedCredit: 4328 },
  { children: 2, earnedIncome: 17880, expectedCredit: 7152 },
  { children: 3, earnedIncome: 17880, expectedCredit: 8046 },
];

const ty2026MaximumCases: EITCMaximumCase[] = [
  { children: 0, earnedIncome: 8680, expectedCredit: 664 },
  { children: 1, earnedIncome: 13020, expectedCredit: 4427 },
  { children: 2, earnedIncome: 18290, expectedCredit: 7316 },
  { children: 3, earnedIncome: 18290, expectedCredit: 8231 },
];

describe("calculateEITC IRS parameter verification", () => {

  it.each(ty2024MaximumCases)(
    "returns TY2024 maximum credit for $children qualifying children",
    ({ children, earnedIncome, expectedCredit }) => {
      const result = calculateEITC({
        taxYear: 2024,
        filingStatus: "single",
        earnedIncome,
        agi: earnedIncome,
        qualifyingChildren: children,
      });

      expect(result.credit).toBe(expectedCredit);
      expect(result.maxPossibleCredit).toBe(expectedCredit);
      expect(result.phase).toBe("phase-in");
    },
  );

  it.each(ty2025MaximumCases)(
    "returns TY2025 maximum credit for $children qualifying children",
    ({ children, earnedIncome, expectedCredit }) => {
      const result = calculateEITC({
        taxYear: 2025,
        filingStatus: "single",
        earnedIncome,
        agi: earnedIncome,
        qualifyingChildren: children,
      });

      expect(result.credit).toBe(expectedCredit);
      expect(result.maxPossibleCredit).toBe(expectedCredit);
      expect(result.phase).toBe("phase-in");
    },
  );

  it.each(ty2026MaximumCases)(
    "returns TY2026 maximum credit for $children qualifying children",
    ({ children, earnedIncome, expectedCredit }) => {
      const result = calculateEITC({
        taxYear: 2026,
        filingStatus: "single",
        earnedIncome,
        agi: earnedIncome,
        qualifyingChildren: children,
      });

      expect(result.credit).toBe(expectedCredit);
      expect(result.maxPossibleCredit).toBe(expectedCredit);
      expect(result.phase).toBe("phase-in");
    },
  );

  it("uses TY2024 phase-out thresholds for one qualifying child", () => {
    const atPhaseoutStart = calculateEITC({
      taxYear: 2024,
      filingStatus: "single",
      earnedIncome: 22720,
      agi: 22720,
      qualifyingChildren: 1,
    });
    const atCompletion = calculateEITC({
      taxYear: 2024,
      filingStatus: "single",
      earnedIncome: 49084,
      agi: 49084,
      qualifyingChildren: 1,
    });

    expect(atPhaseoutStart.credit).toBe(4213);
    expect(atPhaseoutStart.phase).toBe("plateau");
    expect(atCompletion.credit).toBe(0);
    expect(atCompletion.incomeLimit).toBe(49084);
  });

  it("uses TY2025 MFJ completed phase-out amounts", () => {
    const result = calculateEITC({
      taxYear: 2025,
      filingStatus: "married_filing_jointly",
      earnedIncome: 68675,
      agi: 68675,
      qualifyingChildren: 3,
    });

    expect(result.credit).toBe(0);
    expect(result.incomeLimit).toBe(68675);
    expect(result.phase).toBe("ineligible");
  });

  it("uses TY2026 MFJ phaseout and investment-income limits", () => {
    const atCompletion = calculateEITC({
      taxYear: 2026,
      filingStatus: "married_filing_jointly",
      earnedIncome: 70244,
      agi: 70244,
      qualifyingChildren: 3,
    });
    const overInvestmentLimit = calculateEITC({
      taxYear: 2026,
      filingStatus: "single",
      earnedIncome: 18290,
      agi: 18290,
      qualifyingChildren: 3,
      investmentIncome: 12201,
    });

    expect(atCompletion.credit).toBe(0);
    expect(atCompletion.incomeLimit).toBe(70244);
    expect(overInvestmentLimit.reason).toContain("$12,200");
  });
});

describe("calculateEITC phase-out limit during phase-in", () => {
  it("returns zero when AGI phase-out exceeds the phase-in credit", () => {
    // Phase-in 8,000 * 7.65% = 612; phase-out cap 649 - (25,000 - 10,620) * 7.65% < 0.
    const result = calculateEITC({
      taxYear: 2025,
      filingStatus: "single",
      earnedIncome: 8000,
      agi: 25000,
      qualifyingChildren: 0,
    });
    expect(result.credit).toBe(0);
    expect(result.eligible).toBe(false);
  });

  it("limits the phase-in credit to the AGI phase-out amount", () => {
    // Phase-in 10,000 * 34% = 3,400; cap 4,328 - (30,000 - 23,350) * 15.98% = 3,265.33.
    const result = calculateEITC({
      taxYear: 2025,
      filingStatus: "single",
      earnedIncome: 10000,
      agi: 30000,
      qualifyingChildren: 1,
    });
    expect(result.credit).toBe(3265);
    expect(result.phase).toBe("phase-out");
  });

  it("keeps the full phase-in credit when AGI is below the phase-out start", () => {
    const result = calculateEITC({
      taxYear: 2025,
      filingStatus: "single",
      earnedIncome: 10000,
      agi: 20000,
      qualifyingChildren: 1,
    });
    expect(result.credit).toBe(3400);
    expect(result.phase).toBe("phase-in");
  });
});
