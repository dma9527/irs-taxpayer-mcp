/**
 * State income tax reference metadata for all 50 states and DC.
 *
 * STATE_TAX_DATA is reference-only and may span source years. Numeric calculations
 * use STATE_TAX_CALCULATION_DATA and require an exact tax-year profile.
 *
 * Sources:
 *   Tax Foundation: "State Individual Income Tax Rates and Brackets" (2024)
 *   Federation of Tax Administrators: state tax rate tables
 *   Individual state department of revenue websites
 */

export type StateTaxType = "none" | "flat" | "graduated";

export interface StateBracket {
  min: number;
  max: number | null;
  rate: number;
}

export interface LocalTaxInfo {
  name: string;
  rate: number;
  nonResidentRate?: number;
  notes?: string;
}

export interface StateInfo {
  code: string;
  name: string;
  taxType: StateTaxType;
  topRate: number;
  brackets?: StateBracket[];
  marriedBrackets?: StateBracket[];
  standardDeduction?: { single: number; married: number };
  personalExemption?: { single: number; married: number };
  /** Personal exemption is disallowed when income exceeds this amount. */
  exemptionIncomeLimit?: { single: number; married: number };
  notes?: string;
  saltDeductionOnFederal: boolean;
  localTaxes?: boolean;
  localTaxData?: LocalTaxInfo[];
}

export interface StateCalculationInfo extends StateInfo {
  taxYear: number;
  source: string;
}

export const STATE_TAX_DATA: Record<string, StateInfo> = {
  // === NO INCOME TAX ===
  AK: { code: "AK", name: "Alaska", taxType: "none", topRate: 0, saltDeductionOnFederal: false },
  FL: { code: "FL", name: "Florida", taxType: "none", topRate: 0, saltDeductionOnFederal: false },
  NV: { code: "NV", name: "Nevada", taxType: "none", topRate: 0, saltDeductionOnFederal: false },
  NH: { code: "NH", name: "New Hampshire", taxType: "none", topRate: 0, saltDeductionOnFederal: false, notes: "No tax on wages. Interest/dividends tax repealed as of 2025" },
  SD: { code: "SD", name: "South Dakota", taxType: "none", topRate: 0, saltDeductionOnFederal: false },
  TN: { code: "TN", name: "Tennessee", taxType: "none", topRate: 0, saltDeductionOnFederal: false },
  TX: { code: "TX", name: "Texas", taxType: "none", topRate: 0, saltDeductionOnFederal: false },
  WA: { code: "WA", name: "Washington", taxType: "none", topRate: 0, saltDeductionOnFederal: false, notes: "No income tax but has 7% capital gains tax on gains over $270,000 (TY2024)" },
  WY: { code: "WY", name: "Wyoming", taxType: "none", topRate: 0, saltDeductionOnFederal: false },

  // === FLAT TAX STATES ===
  AZ: { code: "AZ", name: "Arizona", taxType: "flat", topRate: 0.025, saltDeductionOnFederal: true, standardDeduction: { single: 14600, married: 29200 } },
  CO: { code: "CO", name: "Colorado", taxType: "flat", topRate: 0.044, saltDeductionOnFederal: true },
  GA: { code: "GA", name: "Georgia", taxType: "flat", topRate: 0.0539, saltDeductionOnFederal: true, standardDeduction: { single: 12000, married: 24000 }, notes: "Transitioning to flat tax, rate decreasing annually" },
  ID: { code: "ID", name: "Idaho", taxType: "flat", topRate: 0.058, saltDeductionOnFederal: true },
  IL: { code: "IL", name: "Illinois", taxType: "flat", topRate: 0.0495, saltDeductionOnFederal: true, personalExemption: { single: 2625, married: 5250 } },
  IN: {
    code: "IN", name: "Indiana", taxType: "flat", topRate: 0.03, saltDeductionOnFederal: true, localTaxes: true, notes: "Counties impose additional income tax (0.25%-3.38%). State rate 3.0% for TY2025", localTaxData: [
      { name: "Marion County (Indianapolis)", rate: 0.0202 },
      { name: "Allen County (Fort Wayne)", rate: 0.0159 },
      { name: "Lake County", rate: 0.015 },
    ]
  },
  IA: { code: "IA", name: "Iowa", taxType: "flat", topRate: 0.038, saltDeductionOnFederal: true, notes: "Transitioned to flat tax in 2025" },
  KS: { code: "KS", name: "Kansas", taxType: "flat", topRate: 0.057, saltDeductionOnFederal: true, standardDeduction: { single: 3500, married: 8000 } },
  KY: { code: "KY", name: "Kentucky", taxType: "flat", topRate: 0.04, saltDeductionOnFederal: true, standardDeduction: { single: 3160, married: 6320 } },
  MA: { code: "MA", name: "Massachusetts", taxType: "flat", topRate: 0.05, saltDeductionOnFederal: true, notes: "Additional 4% surtax on income over $1M (total 9%)" },
  MI: {
    code: "MI", name: "Michigan", taxType: "flat", topRate: 0.0425, saltDeductionOnFederal: true, personalExemption: { single: 5600, married: 11200 }, localTaxes: true, localTaxData: [
      { name: "Detroit", rate: 0.024, nonResidentRate: 0.012 },
      { name: "Grand Rapids", rate: 0.015, nonResidentRate: 0.0075 },
      { name: "Other MI cities (24 total)", rate: 0.01, nonResidentRate: 0.005, notes: "Standard rate for most MI cities" },
    ]
  },
  MS: { code: "MS", name: "Mississippi", taxType: "flat", topRate: 0.04, saltDeductionOnFederal: true, notes: "TY2026 rate is 4% on taxable income above $10,000; numeric profile is unavailable until exemptions and deductions are modeled." },
  NC: { code: "NC", name: "North Carolina", taxType: "flat", topRate: 0.045, saltDeductionOnFederal: true, standardDeduction: { single: 12750, married: 25500 } },
  ND: { code: "ND", name: "North Dakota", taxType: "flat", topRate: 0.0195, saltDeductionOnFederal: true },
  PA: {
    code: "PA", name: "Pennsylvania", taxType: "flat", topRate: 0.0307, saltDeductionOnFederal: true, localTaxes: true, notes: "Philadelphia and other cities impose local income tax", localTaxData: [
      { name: "Philadelphia", rate: 0.0374, nonResidentRate: 0.0343, notes: "Rates effective Jul 1, 2025. Wage tax on all earned income" },
      { name: "Pittsburgh", rate: 0.03, notes: "Residents: 3.0%" },
    ]
  },
  UT: { code: "UT", name: "Utah", taxType: "flat", topRate: 0.0465, saltDeductionOnFederal: true },

  // === GRADUATED TAX STATES (selected major ones with brackets) ===
  AL: {
    code: "AL", name: "Alabama", taxType: "graduated", topRate: 0.05, saltDeductionOnFederal: true, brackets: [
      { min: 0, max: 500, rate: 0.02 }, { min: 500, max: 3000, rate: 0.04 }, { min: 3000, max: null, rate: 0.05 },
    ]
  },
  AR: { code: "AR", name: "Arkansas", taxType: "graduated", topRate: 0.039, saltDeductionOnFederal: true },
  CA: {
    code: "CA", name: "California", taxType: "graduated", topRate: 0.133, saltDeductionOnFederal: true, brackets: [
      { min: 0, max: 10756, rate: 0.01 }, { min: 10756, max: 25499, rate: 0.02 }, { min: 25499, max: 40245, rate: 0.04 },
      { min: 40245, max: 55866, rate: 0.06 }, { min: 55866, max: 70606, rate: 0.08 }, { min: 70606, max: 360659, rate: 0.093 },
      { min: 360659, max: 432787, rate: 0.103 }, { min: 432787, max: 721314, rate: 0.113 }, { min: 721314, max: 1000000, rate: 0.123 },
      { min: 1000000, max: null, rate: 0.133 },
    ], marriedBrackets: [
      { min: 0, max: 21512, rate: 0.01 }, { min: 21512, max: 50998, rate: 0.02 }, { min: 50998, max: 80490, rate: 0.04 },
      { min: 80490, max: 111732, rate: 0.06 }, { min: 111732, max: 141212, rate: 0.08 }, { min: 141212, max: 721318, rate: 0.093 },
      { min: 721318, max: 865574, rate: 0.103 }, { min: 865574, max: 1000000, rate: 0.113 }, { min: 1000000, max: 1442628, rate: 0.123 },
      { min: 1442628, max: null, rate: 0.133 },
    ], standardDeduction: { single: 5540, married: 11080 }, notes: "TY2024 FTB rate schedules. The 1% mental-health tax starts at $1M for every filing status."
  },
  CT: {
    code: "CT", name: "Connecticut", taxType: "graduated", topRate: 0.0699, saltDeductionOnFederal: true, brackets: [
      { min: 0, max: 10000, rate: 0.03 }, { min: 10000, max: 50000, rate: 0.05 }, { min: 50000, max: 100000, rate: 0.055 },
      { min: 100000, max: 200000, rate: 0.06 }, { min: 200000, max: 250000, rate: 0.065 }, { min: 250000, max: 500000, rate: 0.069 },
      { min: 500000, max: null, rate: 0.0699 },
    ]
  },
  DE: {
    code: "DE", name: "Delaware", taxType: "graduated", topRate: 0.066, saltDeductionOnFederal: true, brackets: [
      { min: 0, max: 2000, rate: 0.0 }, { min: 2000, max: 5000, rate: 0.022 }, { min: 5000, max: 10000, rate: 0.039 },
      { min: 10000, max: 20000, rate: 0.048 }, { min: 20000, max: 25000, rate: 0.052 }, { min: 25000, max: 60000, rate: 0.0555 },
      { min: 60000, max: null, rate: 0.066 },
    ], standardDeduction: { single: 3250, married: 6500 }
  },
  HI: {
    code: "HI", name: "Hawaii", taxType: "graduated", topRate: 0.11, saltDeductionOnFederal: true, brackets: [
      { min: 0, max: 2400, rate: 0.014 }, { min: 2400, max: 4800, rate: 0.032 }, { min: 4800, max: 9600, rate: 0.055 },
      { min: 9600, max: 14400, rate: 0.064 }, { min: 14400, max: 19200, rate: 0.068 }, { min: 19200, max: 24000, rate: 0.072 },
      { min: 24000, max: 36000, rate: 0.076 }, { min: 36000, max: 48000, rate: 0.079 }, { min: 48000, max: 150000, rate: 0.0825 },
      { min: 150000, max: 175000, rate: 0.09 }, { min: 175000, max: 200000, rate: 0.10 }, { min: 200000, max: null, rate: 0.11 },
    ], standardDeduction: { single: 2200, married: 4400 }
  },
  LA: { code: "LA", name: "Louisiana", taxType: "graduated", topRate: 0.045, saltDeductionOnFederal: true },
  ME: { code: "ME", name: "Maine", taxType: "graduated", topRate: 0.0715, saltDeductionOnFederal: true },
  MD: {
    code: "MD", name: "Maryland", taxType: "graduated", topRate: 0.0575, saltDeductionOnFederal: true, localTaxes: true, notes: "All counties impose additional 2.25%-3.2% income tax", localTaxData: [
      { name: "Montgomery County", rate: 0.032 },
      { name: "Howard County", rate: 0.032 },
      { name: "Baltimore City", rate: 0.032 },
      { name: "Prince George's County", rate: 0.032 },
      { name: "Anne Arundel County", rate: 0.0281 },
      { name: "Other MD counties", rate: 0.0275, notes: "Range: 2.25%-3.2%" },
    ]
  },
  MN: {
    code: "MN", name: "Minnesota", taxType: "graduated", topRate: 0.0985, saltDeductionOnFederal: true, brackets: [
      { min: 0, max: 30070, rate: 0.0535 }, { min: 30070, max: 98760, rate: 0.068 },
      { min: 98760, max: 183340, rate: 0.0785 }, { min: 183340, max: null, rate: 0.0985 },
    ], standardDeduction: { single: 14575, married: 29150 }
  },
  MO: {
    code: "MO", name: "Missouri", taxType: "graduated", topRate: 0.048, saltDeductionOnFederal: true, brackets: [
      { min: 0, max: 1207, rate: 0.02 }, { min: 1207, max: 2414, rate: 0.025 }, { min: 2414, max: 3621, rate: 0.03 },
      { min: 3621, max: 4828, rate: 0.035 }, { min: 4828, max: 6035, rate: 0.04 }, { min: 6035, max: 7242, rate: 0.045 },
      { min: 7242, max: null, rate: 0.048 },
    ], standardDeduction: { single: 14600, married: 29200 }
  },
  MT: { code: "MT", name: "Montana", taxType: "graduated", topRate: 0.059, saltDeductionOnFederal: true },
  NE: { code: "NE", name: "Nebraska", taxType: "graduated", topRate: 0.0564, saltDeductionOnFederal: true },
  NJ: {
    code: "NJ", name: "New Jersey", taxType: "graduated", topRate: 0.1075, saltDeductionOnFederal: true, brackets: [
      { min: 0, max: 20000, rate: 0.014 }, { min: 20000, max: 35000, rate: 0.0175 }, { min: 35000, max: 40000, rate: 0.035 },
      { min: 40000, max: 75000, rate: 0.05525 }, { min: 75000, max: 500000, rate: 0.0637 }, { min: 500000, max: 1000000, rate: 0.0897 },
      { min: 1000000, max: null, rate: 0.1075 },
    ], notes: "10.75% on income over $1M"
  },
  NM: { code: "NM", name: "New Mexico", taxType: "graduated", topRate: 0.059, saltDeductionOnFederal: true },
  NY: {
    code: "NY", name: "New York", taxType: "graduated", topRate: 0.109, saltDeductionOnFederal: true, brackets: [
      { min: 0, max: 8500, rate: 0.04 }, { min: 8500, max: 11700, rate: 0.045 }, { min: 11700, max: 13900, rate: 0.0525 },
      { min: 13900, max: 80650, rate: 0.055 }, { min: 80650, max: 215400, rate: 0.06 }, { min: 215400, max: 1077550, rate: 0.0685 },
      { min: 1077550, max: 5000000, rate: 0.0965 }, { min: 5000000, max: 25000000, rate: 0.103 }, { min: 25000000, max: null, rate: 0.109 },
    ], standardDeduction: { single: 8000, married: 16050 }, localTaxes: true, notes: "NYC imposes additional 3.078%-3.876% income tax", localTaxData: [
      { name: "New York City", rate: 0.03876, notes: "Progressive: 3.078% (<$12K), 3.762% ($12K-$25K), 3.819% ($25K-$50K), 3.876% (>$50K). Residents only" },
      { name: "Yonkers", rate: 0.01959, notes: "16.75% surcharge on NY state tax. Non-residents: 0.5% of wages" },
    ]
  },
  OH: {
    code: "OH", name: "Ohio", taxType: "graduated", topRate: 0.035, saltDeductionOnFederal: true, localTaxes: true, localTaxData: [
      { name: "Columbus", rate: 0.025 },
      { name: "Cleveland", rate: 0.025 },
      { name: "Cincinnati", rate: 0.018 },
      { name: "Other OH cities (600+)", rate: 0.02, notes: "Range: 0.5%-3.0%. Most cities 1.5%-2.5%" },
    ]
  },
  OK: { code: "OK", name: "Oklahoma", taxType: "graduated", topRate: 0.0475, saltDeductionOnFederal: true },
  OR: {
    code: "OR", name: "Oregon", taxType: "graduated", topRate: 0.099, saltDeductionOnFederal: true, brackets: [
      { min: 0, max: 4050, rate: 0.0475 }, { min: 4050, max: 10200, rate: 0.0675 },
      { min: 10200, max: 125000, rate: 0.0875 }, { min: 125000, max: null, rate: 0.099 },
    ], standardDeduction: { single: 2745, married: 5495 }, notes: "No sales tax but high income tax"
  },
  RI: { code: "RI", name: "Rhode Island", taxType: "graduated", topRate: 0.0599, saltDeductionOnFederal: true },
  SC: { code: "SC", name: "South Carolina", taxType: "graduated", topRate: 0.064, saltDeductionOnFederal: true },
  VT: { code: "VT", name: "Vermont", taxType: "graduated", topRate: 0.0875, saltDeductionOnFederal: true },
  VA: { code: "VA", name: "Virginia", taxType: "graduated", topRate: 0.0575, saltDeductionOnFederal: true, standardDeduction: { single: 8000, married: 16000 } },
  WV: { code: "WV", name: "West Virginia", taxType: "graduated", topRate: 0.0512, saltDeductionOnFederal: true },
  WI: { code: "WI", name: "Wisconsin", taxType: "graduated", topRate: 0.0765, saltDeductionOnFederal: true },
  DC: { code: "DC", name: "District of Columbia", taxType: "graduated", topRate: 0.1075, saltDeductionOnFederal: true },
};

const NO_BROAD_INCOME_TAX_CODES = ["AK", "FL", "NV", "SD", "TN", "TX", "WY"] as const;

function createCalculationProfile(
  stateCode: string,
  taxYear: number,
  source: string,
  overrides: Partial<StateInfo> = {},
): StateCalculationInfo {
  const state = STATE_TAX_DATA[stateCode];
  if (!state) {
    throw new Error(`Unknown state calculation profile: ${stateCode}`);
  }
  return { ...state, ...overrides, taxYear, source };
}

// FTB TY2026 Schedules X and Y with the 1% Mental Health Services Tax spliced in above $1,000,000.
const CA_2026_SINGLE: StateBracket[] = [
  { min: 0, max: 11456, rate: 0.01 }, { min: 11456, max: 27157, rate: 0.02 }, { min: 27157, max: 42861, rate: 0.04 },
  { min: 42861, max: 59498, rate: 0.06 }, { min: 59498, max: 75197, rate: 0.08 }, { min: 75197, max: 384109, rate: 0.093 },
  { min: 384109, max: 460927, rate: 0.103 }, { min: 460927, max: 768213, rate: 0.113 }, { min: 768213, max: 1000000, rate: 0.123 },
  { min: 1000000, max: null, rate: 0.133 },
];
const CA_2026_JOINT: StateBracket[] = [
  { min: 0, max: 22912, rate: 0.01 }, { min: 22912, max: 54314, rate: 0.02 }, { min: 54314, max: 85722, rate: 0.04 },
  { min: 85722, max: 118996, rate: 0.06 }, { min: 118996, max: 150394, rate: 0.08 }, { min: 150394, max: 768218, rate: 0.093 },
  { min: 768218, max: 921854, rate: 0.103 }, { min: 921854, max: 1000000, rate: 0.113 }, { min: 1000000, max: 1536426, rate: 0.123 },
  { min: 1536426, max: null, rate: 0.133 },
];

// Massachusetts applies the 4% surtax to taxable income above one threshold for every filing status.
const MA_2026_BRACKETS: StateBracket[] = [
  { min: 0, max: 1107750, rate: 0.05 },
  { min: 1107750, max: null, rate: 0.09 },
];

function createNoTaxProfiles(taxYear: number): Partial<Record<string, StateCalculationInfo>> {
  return Object.fromEntries(
    NO_BROAD_INCOME_TAX_CODES.map((stateCode) => [
      stateCode,
      createCalculationProfile(
        stateCode,
        taxYear,
        `${STATE_TAX_DATA[stateCode].name} revenue authority, TY${taxYear}`,
      ),
    ]),
  );
}

export const STATE_TAX_CALCULATION_DATA: Record<
  number,
  Partial<Record<string, StateCalculationInfo>>
> = {
  2024: {
    ...createNoTaxProfiles(2024),
    CA: createCalculationProfile(
      "CA",
      2024,
      "California Franchise Tax Board 2024 tax rate schedules",
    ),
  },
  2025: {
    ...createNoTaxProfiles(2025),
    NH: createCalculationProfile(
      "NH",
      2025,
      "New Hampshire Department of Revenue Administration, interest and dividends tax repeal effective TY2025",
    ),
  },
  2026: {
    ...createNoTaxProfiles(2026),
    NH: createCalculationProfile(
      "NH",
      2026,
      "New Hampshire Department of Revenue Administration, no broad individual income tax",
    ),
    CA: createCalculationProfile(
      "CA",
      2026,
      "California FTB Tax News, October 2026: 2026 indexing and tax rate schedules",
      {
        brackets: CA_2026_SINGLE,
        marriedBrackets: CA_2026_JOINT,
        standardDeduction: { single: 5900, married: 11800 },
        notes: "TY2026 FTB Schedules X and Y; 1% Mental Health Services Tax above $1,000,000. Exemption credits and the HoH Schedule Z are not modeled",
      },
    ),
    MA: createCalculationProfile(
      "MA",
      2026,
      "Massachusetts DOR tax rates (TY2026 surtax threshold $1,107,750) and personal exemption amounts",
      {
        taxType: "graduated",
        topRate: 0.09,
        brackets: MA_2026_BRACKETS,
        marriedBrackets: MA_2026_BRACKETS,
        personalExemption: { single: 4400, married: 8800 },
        notes: "Part A short-term gains (8.5%), dependent and age exemptions, and MA-specific deductions are not modeled",
      },
    ),
    IL: createCalculationProfile(
      "IL",
      2026,
      "Illinois Department of Revenue, TY2026 rate 4.95% and $2,925 exemption allowance",
      {
        personalExemption: { single: 2925, married: 5850 },
        exemptionIncomeLimit: { single: 250000, married: 500000 },
        notes: "Dependent and age 65 or blind exemptions and Illinois subtractions such as retirement income are not modeled",
      },
    ),
    PA: createCalculationProfile(
      "PA",
      2026,
      "Pennsylvania Department of Revenue, 3.07% flat rate (REV-414(I) 2026)",
      {
        notes: "PA taxes eight income classes without federal adjustments; local earned income taxes and Tax Forgiveness are not modeled",
      },
    ),
    NC: createCalculationProfile(
      "NC",
      2026,
      "NCDOR tax rate schedules (3.99% for tax years after 2025) and statutory standard deduction",
      {
        topRate: 0.0399,
        standardDeduction: { single: 12750, married: 25500 },
        notes: "Confirm the standard deduction against the 2026 D-400 instructions (January 2027); child deduction not modeled",
      },
    ),
    MI: createCalculationProfile(
      "MI",
      2026,
      "Michigan Treasury notice of April 15, 2026 (4.25% under MCL 206.51) and 2026 Form 446 personal exemption ($5,900)",
      {
        personalExemption: { single: 5900, married: 11800 },
        notes: "Dependent, special, and senior exemptions, retirement subtractions, and city income taxes are not modeled. Confirm the exemption against the 2026 MI-1040 instructions",
      },
    ),
    IN: createCalculationProfile(
      "IN",
      2026,
      "Indiana DOR 2026 rate 2.95% (IC 6-3-2-1) and $1,000 personal exemption per spouse (IC 6-3-1-3.5)",
      {
        topRate: 0.0295,
        personalExemption: { single: 1000, married: 2000 },
        notes: "County income taxes, dependent exemptions, and Indiana deductions are not modeled",
      },
    ),
    KY: createCalculationProfile(
      "KY",
      2026,
      "Kentucky DOR: 3.5% for tax years beginning on or after January 1, 2026 (KRS 141.020) and 2026 standard deduction $3,360 (KRS 141.081)",
      {
        topRate: 0.035,
        standardDeduction: { single: 3360, married: 3360 },
        notes: "Married uses a joint return with one deduction; two-earner couples filing separately on a combined return get a deduction each. Local occupational taxes and the Family Size Tax Credit are not modeled",
      },
    ),
  },
};

export function getStateInfo(stateCode: string): StateInfo | undefined {
  return STATE_TAX_DATA[stateCode.toUpperCase()];
}

export function getStateCalculationInfo(
  stateCode: string,
  taxYear: number,
): StateCalculationInfo | undefined {
  return STATE_TAX_CALCULATION_DATA[taxYear]?.[stateCode.toUpperCase()];
}

export function getNoIncomeTaxStates(): StateInfo[] {
  return Object.values(STATE_TAX_DATA).filter((s) => s.taxType === "none");
}
