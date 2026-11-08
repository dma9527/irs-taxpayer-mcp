import { describe, expect, it } from "vitest";
import { calculateStateTax } from "./state-tax-calculator.js";

describe("calculateStateTax accuracy safeguards", () => {
  it("fails closed when a graduated state has no brackets", () => {
    expect(() =>
      calculateStateTax({
        stateCode: "AR",
        taxYear: 2024,
        taxableIncome: 100000,
        filingStatus: "single",
      }),
    ).toThrow("Arkansas TY2024 calculation data are not available");
  });

  it("uses explicit California married brackets", () => {
    const single = calculateStateTax({
      stateCode: "CA",
      taxYear: 2024,
      taxableIncome: 100000,
      filingStatus: "single",
    });
    const married = calculateStateTax({
      stateCode: "CA",
      taxYear: 2024,
      incomeBeforeDeductions: 100000,
      filingStatus: "married",
    });

    expect(single?.tax).toBe(5327);
    expect(married?.tax).toBe(2490);
  });

  it("keeps the legacy taxableIncome alias equivalent", () => {
    const explicit = calculateStateTax({
      stateCode: "CA",
      taxYear: 2024,
      incomeBeforeDeductions: 100000,
      filingStatus: "single",
    });
    const legacy = calculateStateTax({
      stateCode: "CA",
      taxYear: 2024,
      taxableIncome: 100000,
      filingStatus: "single",
    });

    expect(legacy).toEqual(explicit);
  });

  it("applies California mental-health surcharge above $1M for married filers", () => {
    const result = calculateStateTax({
      stateCode: "CA",
      taxYear: 2024,
      taxableIncome: 1200000,
      filingStatus: "married",
    });

    expect(result?.adjustedIncome).toBe(1188920);
    expect(result?.tax).toBe(113453);
  });

  it("fails closed when the state has no profile for the requested year", () => {
    expect(() =>
      calculateStateTax({
        stateCode: "CA",
        taxYear: 2025,
        incomeBeforeDeductions: 100000,
        filingStatus: "single",
      }),
    ).toThrow("California TY2025 calculation data are not available");
  });

  it("fails closed when an unverified state profile is unavailable", () => {
    expect(() =>
      calculateStateTax({
        stateCode: "NY",
        taxYear: 2024,
        taxableIncome: 100000,
        filingStatus: "married",
      }),
    ).toThrow("New York TY2024 calculation data are not available");
  });
});

describe("TY2026 state profiles", () => {
  it("applies the Massachusetts personal exemption at 5%", () => {
    // ($100,000 - $4,400) x 5%.
    const result = calculateStateTax({ stateCode: "MA", taxYear: 2026, incomeBeforeDeductions: 100000, filingStatus: "single" });
    expect(result?.tax).toBe(4780);
  });

  it("applies the Massachusetts 4% surtax above $1,107,750", () => {
    // ($2,000,000 - $8,800) x 5% + ($1,991,200 - $1,107,750) x 4%.
    const result = calculateStateTax({ stateCode: "MA", taxYear: 2026, incomeBeforeDeductions: 2000000, filingStatus: "married" });
    expect(result?.tax).toBe(134898);
  });

  it("applies the Illinois $2,925 exemption per person", () => {
    const single = calculateStateTax({ stateCode: "IL", taxYear: 2026, incomeBeforeDeductions: 100000, filingStatus: "single" });
    const married = calculateStateTax({ stateCode: "IL", taxYear: 2026, incomeBeforeDeductions: 400000, filingStatus: "married" });
    expect(single?.tax).toBe(4805);
    expect(married?.tax).toBe(19510);
  });

  it("disallows the Illinois exemption above $250,000 AGI", () => {
    const result = calculateStateTax({ stateCode: "IL", taxYear: 2026, incomeBeforeDeductions: 300000, filingStatus: "single" });
    expect(result?.deduction).toBe(0);
    expect(result?.tax).toBe(14850);
  });

  it("applies the Pennsylvania 3.07% flat rate with no deduction", () => {
    const result = calculateStateTax({ stateCode: "PA", taxYear: 2026, incomeBeforeDeductions: 100000, filingStatus: "single" });
    expect(result?.tax).toBe(3070);
    expect(result?.hasLocalTaxes).toBe(true);
  });

  it("applies the North Carolina 3.99% rate after the standard deduction", () => {
    const single = calculateStateTax({ stateCode: "NC", taxYear: 2026, incomeBeforeDeductions: 100000, filingStatus: "single" });
    const married = calculateStateTax({ stateCode: "NC", taxYear: 2026, incomeBeforeDeductions: 125500, filingStatus: "married" });
    expect(single?.tax).toBe(3481);
    expect(married?.tax).toBe(3990);
  });

  it("uses the TY2026 California FTB schedules and standard deduction", () => {
    // Single: 94,100 taxable -> 3,310.88 + 9.3% x 18,903. MFJ: 188,200 -> 6,621.76 + 9.3% x 37,806.
    const single = calculateStateTax({ stateCode: "CA", taxYear: 2026, incomeBeforeDeductions: 100000, filingStatus: "single" });
    const married = calculateStateTax({ stateCode: "CA", taxYear: 2026, incomeBeforeDeductions: 200000, filingStatus: "married" });
    expect(single?.deduction).toBe(5900);
    expect(single?.tax).toBe(5069);
    expect(married?.deduction).toBe(11800);
    expect(married?.tax).toBe(10138);
  });

  it("adds the 1% Mental Health Services Tax above $1,000,000 for TY2026 California", () => {
    // 74,675.27 + 12.3% x (1,194,100 - 768,213) + 1% x 194,100.
    const result = calculateStateTax({ stateCode: "CA", taxYear: 2026, incomeBeforeDeductions: 1200000, filingStatus: "single" });
    expect(result?.tax).toBe(129000);
  });

  it("applies the Michigan 4.25% rate after the $5,900 exemption per person", () => {
    // (100,000 - 5,900) x 4.25% = 3,999.25; (200,100 - 11,800) x 4.25% = 8,002.75.
    const single = calculateStateTax({ stateCode: "MI", taxYear: 2026, incomeBeforeDeductions: 100000, filingStatus: "single" });
    const married = calculateStateTax({ stateCode: "MI", taxYear: 2026, incomeBeforeDeductions: 200100, filingStatus: "married" });
    expect(single?.tax).toBe(3999);
    expect(married?.tax).toBe(8003);
    expect(single?.hasLocalTaxes).toBe(true);
  });

  it("applies the Indiana 2.95% rate after the $1,000 exemption per person", () => {
    // (100,200 - 1,000) x 2.95% = 2,926.40; (150,000 - 2,000) x 2.95% = 4,366.
    const single = calculateStateTax({ stateCode: "IN", taxYear: 2026, incomeBeforeDeductions: 100200, filingStatus: "single" });
    const married = calculateStateTax({ stateCode: "IN", taxYear: 2026, incomeBeforeDeductions: 150000, filingStatus: "married" });
    expect(single?.tax).toBe(2926);
    expect(married?.tax).toBe(4366);
    expect(single?.hasLocalTaxes).toBe(true);
  });

  it("applies the Kentucky 3.5% rate after one $3,360 standard deduction per return", () => {
    // (100,000 - 3,360) x 3.5% = 3,382.40; joint return takes one deduction: (80,000 - 3,360) x 3.5% = 2,682.40.
    const single = calculateStateTax({ stateCode: "KY", taxYear: 2026, incomeBeforeDeductions: 100000, filingStatus: "single" });
    const married = calculateStateTax({ stateCode: "KY", taxYear: 2026, incomeBeforeDeductions: 80000, filingStatus: "married" });
    expect(single?.tax).toBe(3382);
    expect(married?.tax).toBe(2682);
  });

  it("applies the Georgia 4.99% rate after the TY2026 $15,000 / $30,000 standard deduction", () => {
    // (100,100 - 15,000) x 4.99% = 4,246.49; (150,000 - 30,000) x 4.99% = 5,988.
    const single = calculateStateTax({ stateCode: "GA", taxYear: 2026, incomeBeforeDeductions: 100100, filingStatus: "single" });
    const married = calculateStateTax({ stateCode: "GA", taxYear: 2026, incomeBeforeDeductions: 150000, filingStatus: "married" });
    expect(single?.tax).toBe(4246);
    expect(married?.tax).toBe(5988);
  });

  it("applies the Virginia schedule after the standard deduction and $930 exemptions", () => {
    // Single: 100,000 - 8,750 - 930 = 90,320; 60 + 60 + 600 + 5.75% x 73,320 = 4,935.90.
    // MFJ: 150,000 - 17,500 - 1,860 = 130,640; 720 + 5.75% x 113,640 = 7,254.30.
    const single = calculateStateTax({ stateCode: "VA", taxYear: 2026, incomeBeforeDeductions: 100000, filingStatus: "single" });
    const married = calculateStateTax({ stateCode: "VA", taxYear: 2026, incomeBeforeDeductions: 150000, filingStatus: "married" });
    expect(single?.deduction).toBe(9680);
    expect(single?.tax).toBe(4936);
    expect(married?.tax).toBe(7254);
  });

  it("uses New Jersey Table A for single and Table B for joint returns", () => {
    // Table A: 99,000 x 6.37% - 2,126.25 = 4,180.05. Table B: 198,000 x 6.37% - 4,042.50 = 8,570.10.
    const single = calculateStateTax({ stateCode: "NJ", taxYear: 2026, incomeBeforeDeductions: 100000, filingStatus: "single" });
    const married = calculateStateTax({ stateCode: "NJ", taxYear: 2026, incomeBeforeDeductions: 200000, filingStatus: "married" });
    expect(single?.tax).toBe(4180);
    expect(married?.tax).toBe(8570);
  });

  it.each([
    // Exemption tier by income; tax is $332 + 2.75% over $26,050, or zero at or below $26,050.
    ["single", 25000, 2400, 0],
    ["single", 30000, 2400, 375],
    ["single", 60100, 2150, 1209],
    ["married", 120000, 3800, 2811],
    ["single", 600000, 0, 16116],
  ] as const)("applies the Ohio TY2026 schedule: %s at $%i", (filingStatus, income, deduction, tax) => {
    const result = calculateStateTax({ stateCode: "OH", taxYear: 2026, incomeBeforeDeductions: income, filingStatus });
    expect(result?.deduction).toBe(deduction);
    expect(result?.tax).toBe(tax);
  });

  it.each([
    // Deductions are the exemption plus standard deduction; zero tax up to the first $10,000 of taxable income.
    ["single", 50000, 8300, 1268],
    ["married", 100000, 16600, 2936],
    ["single", 15000, 8300, 0],
  ] as const)("applies the Mississippi TY2026 rate above the first 10,000 of taxable income: %s at %i", (filingStatus, income, deduction, tax) => {
    const result = calculateStateTax({ stateCode: "MS", taxYear: 2026, incomeBeforeDeductions: income, filingStatus });
    expect(result?.deduction).toBe(deduction);
    expect(result?.tax).toBe(tax);
  });

  it("applies the Rhode Island TY2026 uniform schedule after the standard deduction and exemption", () => {
    // Single: 100,000 - 11,200 - 5,250 = 83,550; 3,076.88 + 4.75% x 1,500 = 3,148.13.
    // Joint: 200,000 - 22,400 - 10,500 = 167,100; 3,076.88 + 4.75% x 85,050 = 7,116.75.
    const single = calculateStateTax({ stateCode: "RI", taxYear: 2026, incomeBeforeDeductions: 100000, filingStatus: "single" });
    const married = calculateStateTax({ stateCode: "RI", taxYear: 2026, incomeBeforeDeductions: 200000, filingStatus: "married" });
    expect(single?.tax).toBe(3148);
    expect(married?.tax).toBe(7117);
  });

  it("fails closed for Rhode Island income inside the deduction phase-out range", () => {
    expect(() =>
      calculateStateTax({ stateCode: "RI", taxYear: 2026, incomeBeforeDeductions: 261001, filingStatus: "single" }),
    ).toThrow("Rhode Island");
    expect(
      calculateStateTax({ stateCode: "RI", taxYear: 2026, incomeBeforeDeductions: 261000, filingStatus: "single" })?.tax,
    ).toBeGreaterThan(0);
  });

  it("applies the Nebraska TY2026 schedule, standard deduction, and personal exemption credit", () => {
    // Single: 100,000 - 8,850 = 91,150; 1,514.58 + 4.55% x 51,250 = 3,846.46; less 176 credit.
    // Joint: 150,000 - 17,700 = 132,300; 3,029.16 + 4.55% x 52,500 = 5,417.91; less 352 credit.
    const single = calculateStateTax({ stateCode: "NE", taxYear: 2026, incomeBeforeDeductions: 100000, filingStatus: "single" });
    const married = calculateStateTax({ stateCode: "NE", taxYear: 2026, incomeBeforeDeductions: 150000, filingStatus: "married" });
    expect(single?.tax).toBe(3670);
    expect(married?.tax).toBe(5066);
  });

  it("never lets the Nebraska personal exemption credit make tax negative", () => {
    const result = calculateStateTax({ stateCode: "NE", taxYear: 2026, incomeBeforeDeductions: 9000, filingStatus: "single" });
    expect(result?.tax).toBe(0);
  });

  it("applies the Minnesota TY2026 brackets after the standard deduction", () => {
    // Single: 100,000 - 15,300 = 84,700; 5.35% x 33,310 + 6.80% x 51,390 = 5,276.61.
    // Joint: 200,000 - 30,600 = 169,400; 5.35% x 48,700 + 6.80% x 120,700 = 10,813.05.
    const single = calculateStateTax({ stateCode: "MN", taxYear: 2026, incomeBeforeDeductions: 100000, filingStatus: "single" });
    const married = calculateStateTax({ stateCode: "MN", taxYear: 2026, incomeBeforeDeductions: 200000, filingStatus: "married" });
    expect(single?.tax).toBe(5277);
    expect(married?.tax).toBe(10813);
  });

  it("fails closed for Minnesota AGI above the standard deduction reduction threshold", () => {
    expect(() =>
      calculateStateTax({ stateCode: "MN", taxYear: 2026, incomeBeforeDeductions: 220651, filingStatus: "married" }),
    ).toThrow("Minnesota");
  });

  it("applies the Kansas 5.2% and 5.58% schedule after the standard deduction and exemption", () => {
    // Single: 75,000 - 3,605 - 9,160 = 62,235; 1,196 + 5.58% x 39,235 = 3,385.31.
    // Joint: 120,000 - 8,240 - 18,320 = 93,440; 2,392 + 5.58% x 47,440 = 5,039.15.
    const single = calculateStateTax({ stateCode: "KS", taxYear: 2026, incomeBeforeDeductions: 75000, filingStatus: "single" });
    const married = calculateStateTax({ stateCode: "KS", taxYear: 2026, incomeBeforeDeductions: 120000, filingStatus: "married" });
    expect(single?.tax).toBe(3385);
    expect(married?.tax).toBe(5039);
  });

  it("applies the North Dakota TY2026 schedule to federal taxable income", () => {
    // Single: 1.95% x (100,000 - 49,575) = 983.29. Joint: 4,329.98 + 2.50% x (400,000 - 304,850) = 6,708.73.
    const single = calculateStateTax({ stateCode: "ND", taxYear: 2026, incomeBeforeDeductions: 120000, federalTaxableIncome: 100000, filingStatus: "single" });
    const married = calculateStateTax({ stateCode: "ND", taxYear: 2026, incomeBeforeDeductions: 430000, federalTaxableIncome: 400000, filingStatus: "married" });
    const low = calculateStateTax({ stateCode: "ND", taxYear: 2026, incomeBeforeDeductions: 55000, federalTaxableIncome: 40000, filingStatus: "single" });
    expect(single?.tax).toBe(983);
    expect(single?.adjustedIncome).toBe(100000);
    expect(married?.tax).toBe(6709);
    expect(low?.tax).toBe(0);
  });

  it("fails closed for North Dakota without federal taxable income", () => {
    expect(() =>
      calculateStateTax({ stateCode: "ND", taxYear: 2026, incomeBeforeDeductions: 100000, filingStatus: "single" }),
    ).toThrow("federal taxable income");
  });

  it("still fails closed for TY2026 states without a verified profile", () => {
    expect(() =>
      calculateStateTax({ stateCode: "AZ", taxYear: 2026, incomeBeforeDeductions: 100000, filingStatus: "single" }),
    ).toThrow("Arizona TY2026 calculation data are not available");
  });
});

describe("TY2026 head of household and married filing separately", () => {
  const tax = (stateCode: string, filingStatus: "head_of_household" | "married_filing_separately", income: number, federalTaxableIncome?: number) =>
    calculateStateTax({ stateCode, taxYear: 2026, incomeBeforeDeductions: income, filingStatus, federalTaxableIncome })?.tax;

  it.each([
    // CA Schedule Z on 88,200: 2,483.29 + 8% x 1,546.
    ["CA", 100000, 2607],
    // MN HoH on 77,000: 5.35% x 41,010 + 6.80% x 35,990.
    ["MN", 100000, 4641],
    // KS: 100,000 - 6,180 - 9,160 = 84,660; 1,196 + 5.58% x 61,660.
    ["KS", 100000, 4637],
    // NE: 100,000 - 12,950 = 87,050; 2,198.88 + 4.55% x 27,890 - 176.
    ["NE", 100000, 3292],
    // NJ Table B on 99,000: 99,000 x 5.525% - 2,775.
    ["NJ", 100000, 2695],
    // MS: 50,000 - 8,000 - 3,400 = 38,600; 4% x 28,600.
    ["MS", 50000, 1144],
    // RI: 100,000 - 16,800 - 5,250 = 77,950; 3.75%.
    ["RI", 100000, 2923],
    // NC: (100,000 - 19,125) x 3.99%.
    ["NC", 100000, 3227],
    // MA: (100,000 - 6,800) x 5%.
    ["MA", 100000, 4660],
  ] as const)("uses the %s head of household rules", (stateCode, income, expected) => {
    expect(tax(stateCode, "head_of_household", income)).toBe(expected);
  });

  it.each([
    // CA Schedule X and $5,900, same as single.
    ["CA", 100000, 5069],
    // MN MFS on 84,700: 5.35% x 24,350 + 6.80% x 60,350.
    ["MN", 100000, 5407],
    // KS: 100,000 - 4,120 - 9,160 = 86,720; 1,196 + 5.58% x 63,720.
    ["KS", 100000, 4752],
    // NE MFS uses the single schedule and $8,850.
    ["NE", 100000, 3670],
    // NJ Table A, same as single.
    ["NJ", 100000, 4180],
    // MS MFS exemption $6,000 and $2,300, same as single.
    ["MS", 50000, 1268],
  ] as const)("uses the %s married filing separately rules", (stateCode, income, expected) => {
    expect(tax(stateCode, "married_filing_separately", income)).toBe(expected);
  });

  it("uses the North Dakota head of household and separate schedules on federal taxable income", () => {
    // HoH: 1.95% x (100,000 - 66,400) = 655.20. MFS: 1.95% x (100,000 - 41,400) = 1,142.70.
    expect(tax("ND", "head_of_household", 120000, 100000)).toBe(655);
    expect(tax("ND", "married_filing_separately", 120000, 100000)).toBe(1143);
  });

  it("halves the Minnesota modeled income limit for married filing separately", () => {
    expect(tax("MN", "married_filing_separately", 110325)).toBeGreaterThan(0);
    expect(() => tax("MN", "married_filing_separately", 110326)).toThrow("Minnesota");
  });

  it.each(["GA", "IL", "IN", "KY", "MI", "OH", "PA", "VA"])("applies single amounts to %s head of household and separate filers", (stateCode) => {
    const single = calculateStateTax({ stateCode, taxYear: 2026, incomeBeforeDeductions: 90000, filingStatus: "single" })?.tax;
    expect(tax(stateCode, "head_of_household", 90000)).toBe(single);
    expect(tax(stateCode, "married_filing_separately", 90000)).toBe(single);
  });

  it("accepts married filing jointly as an alias of married", () => {
    const married = calculateStateTax({ stateCode: "MN", taxYear: 2026, incomeBeforeDeductions: 200000, filingStatus: "married" })?.tax;
    const joint = calculateStateTax({ stateCode: "MN", taxYear: 2026, incomeBeforeDeductions: 200000, filingStatus: "married_filing_jointly" })?.tax;
    expect(joint).toBe(married);
  });

  it("keeps TY2024 head of household on the single schedule", () => {
    const single = calculateStateTax({ stateCode: "CA", taxYear: 2024, incomeBeforeDeductions: 100000, filingStatus: "single" })?.tax;
    const head = calculateStateTax({ stateCode: "CA", taxYear: 2024, incomeBeforeDeductions: 100000, filingStatus: "head_of_household" })?.tax;
    expect(head).toBe(single);
  });
});
