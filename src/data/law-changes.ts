/**
 * Federal and supported-state law changes keyed by the first tax year they apply.
 * Annual inflation adjustments live in tax-brackets.ts; this registry records rule changes.
 */

export type LawChangeKind = "new" | "changed" | "expired";
export type LawChangeModeling = "calculated" | "reference" | "not_modeled";

export interface LawChangeSource {
  title: string;
  url: string;
}

export interface LawChange {
  id: string;
  effectiveTaxYear: number;
  kind: LawChangeKind;
  title: string;
  summary: string;
  citation: string;
  modeling: LawChangeModeling;
  sources: LawChangeSource[];
}

const OBBB_TEXT: LawChangeSource = {
  title: "Public Law 119-21 (H.R. 1, One Big Beautiful Bill Act), enrolled text",
  url: "https://www.govinfo.gov/content/pkg/BILLS-119hr1enr/html/BILLS-119hr1enr.htm",
};
const IRS_OBBB_PROVISIONS: LawChangeSource = {
  title: "IRS, One Big Beautiful Bill provisions",
  url: "https://www.irs.gov/newsroom/one-big-beautiful-bill-provisions",
};

export const LAW_CHANGES: LawChange[] = [
  // TY2025: OBBB provisions for taxable years beginning after December 31, 2024.
  {
    id: "ty2025-standard-deduction",
    effectiveTaxYear: 2025,
    kind: "changed",
    title: "Standard deduction increase",
    summary: "Standard deduction set to $15,750 single, $31,500 MFJ, $23,625 HoH, then indexed.",
    citation: "IRC 63(c)(7); OBBB sec. 70102",
    modeling: "calculated",
    sources: [OBBB_TEXT],
  },
  {
    id: "ty2025-ctc",
    effectiveTaxYear: 2025,
    kind: "changed",
    title: "Child Tax Credit increase",
    summary: "Credit raised to $2,200 per qualifying child; $200,000/$400,000 phase-out made permanent.",
    citation: "IRC 24(h); OBBB sec. 70104",
    modeling: "calculated",
    sources: [OBBB_TEXT],
  },
  {
    id: "ty2025-salt",
    effectiveTaxYear: 2025,
    kind: "changed",
    title: "SALT deduction cap increase",
    summary: "Cap raised to $40,000 ($20,000 MFS), reduced by 30% of MAGI over $500,000, not below $10,000.",
    citation: "IRC 164(b)(7); OBBB sec. 70120",
    modeling: "calculated",
    sources: [OBBB_TEXT],
  },
  {
    id: "ty2025-tips",
    effectiveTaxYear: 2025,
    kind: "new",
    title: "Qualified tips deduction",
    summary: "Up to $25,000 through TY2028, reduced $100 per full $1,000 of MAGI over $150,000 ($300,000 MFJ).",
    citation: "IRC 224; OBBB sec. 70201",
    modeling: "calculated",
    sources: [OBBB_TEXT],
  },
  {
    id: "ty2025-overtime",
    effectiveTaxYear: 2025,
    kind: "new",
    title: "Qualified overtime deduction",
    summary: "Up to $12,500 ($25,000 MFJ) through TY2028, reduced $100 per full $1,000 of MAGI over $150,000 ($300,000 MFJ).",
    citation: "IRC 225; OBBB sec. 70202",
    modeling: "calculated",
    sources: [OBBB_TEXT],
  },
  {
    id: "ty2025-vehicle-loan-interest",
    effectiveTaxYear: 2025,
    kind: "new",
    title: "Vehicle loan interest deduction",
    summary: "Up to $10,000 through TY2028 for new US-assembled vehicles, reduced $200 per $1,000 or portion of MAGI over $100,000 ($200,000 MFJ).",
    citation: "IRC 163(h)(4); OBBB sec. 70203",
    modeling: "calculated",
    sources: [OBBB_TEXT],
  },
  {
    id: "ty2025-senior-deduction",
    effectiveTaxYear: 2025,
    kind: "new",
    title: "Senior deduction",
    summary: "$6,000 per person 65 or older through TY2028, reduced by 6% of MAGI over $75,000 ($150,000 MFJ).",
    citation: "IRC 151(d)(5)(C); OBBB sec. 70103",
    modeling: "calculated",
    sources: [OBBB_TEXT],
  },
  // TY2026: OBBB provisions for taxable years beginning after December 31, 2025.
  {
    id: "ty2026-amt-phaseout",
    effectiveTaxYear: 2026,
    kind: "changed",
    title: "AMT exemption phase-out",
    summary: "Phase-out starts at $500,000 ($1,000,000 MFJ) of AMTI and the exemption falls 50 cents per dollar instead of 25 cents.",
    citation: "IRC 55(d)(3), (d)(4); OBBB sec. 70107",
    modeling: "calculated",
    sources: [OBBB_TEXT],
  },
  {
    id: "ty2026-itemized-limit",
    effectiveTaxYear: 2026,
    kind: "new",
    title: "Itemized deduction limit (2/37)",
    summary: "Itemized deductions reduced by 2/37 of the lesser of itemized deductions or income above the 37% bracket start.",
    citation: "IRC 68; OBBB sec. 70111",
    modeling: "calculated",
    sources: [OBBB_TEXT],
  },
  {
    id: "ty2026-nonitemizer-charitable",
    effectiveTaxYear: 2026,
    kind: "new",
    title: "Non-itemizer charitable deduction",
    summary: "Up to $1,000 ($2,000 MFJ) of cash gifts to public charities; donor-advised funds and supporting organizations excluded.",
    citation: "IRC 170(p); OBBB sec. 70424",
    modeling: "calculated",
    sources: [OBBB_TEXT, IRS_OBBB_PROVISIONS],
  },
  {
    id: "ty2026-charitable-floor",
    effectiveTaxYear: 2026,
    kind: "new",
    title: "0.5% charitable contribution floor",
    summary: "Itemized charitable contributions deductible only above 0.5% of the contribution base.",
    citation: "IRC 170(b)(1)(I); OBBB sec. 70425",
    modeling: "calculated",
    sources: [OBBB_TEXT],
  },
  {
    id: "ty2026-dependent-care-credit",
    effectiveTaxYear: 2026,
    kind: "changed",
    title: "Child and Dependent Care Credit",
    summary: "Top rate 50%, reduced 1 point per $2,000 or fraction of AGI over $15,000 to 35%, then per $2,000 ($4,000 MFJ) over $75,000 ($150,000 MFJ) to 20%.",
    citation: "IRC 21(a)(2); OBBB sec. 70405",
    modeling: "calculated",
    sources: [OBBB_TEXT, IRS_OBBB_PROVISIONS],
  },
  {
    id: "ty2026-dependent-care-assistance",
    effectiveTaxYear: 2026,
    kind: "changed",
    title: "Dependent care assistance exclusion",
    summary: "Employer dependent care benefit exclusion raised from $5,000 to $7,500 ($3,750 MFS).",
    citation: "IRC 129(a)(2)(A); OBBB sec. 70404",
    modeling: "reference",
    sources: [OBBB_TEXT],
  },
  {
    id: "ty2026-qbi",
    effectiveTaxYear: 2026,
    kind: "changed",
    title: "QBI phase-in range and minimum deduction",
    summary: "Phase-in range widened to $75,000 ($150,000 MFJ); $400 minimum deduction with at least $1,000 of active QBI.",
    citation: "IRC 199A(b)(3), (d)(3), (i); OBBB sec. 70105",
    modeling: "calculated",
    sources: [OBBB_TEXT],
  },
  {
    id: "ty2026-clean-vehicle-credits",
    effectiveTaxYear: 2026,
    kind: "expired",
    title: "Clean vehicle credits",
    summary: "New and used clean vehicle credits not allowed for vehicles acquired after September 30, 2025.",
    citation: "IRC 25E, 30D; OBBB",
    modeling: "reference",
    sources: [{
      title: "IRS FAQs for modification of sections 25C, 25D, 25E, 30C, 30D, 45L, 45W, and 179D under OBBB",
      url: "https://www.irs.gov/newsroom/faqs-for-modification-of-sections-25c-25d-25e-30c-30d-45l-45w-and-179d-under-public-law-119-21-139-stat-72-july-4-2025-commonly-known-as-the-one-big-beautiful-bill-obbb",
    }],
  },
  {
    id: "ty2026-home-energy-credits",
    effectiveTaxYear: 2026,
    kind: "expired",
    title: "Home energy credits",
    summary: "Residential clean energy and energy efficient home improvement credits end for expenditures or property placed in service after December 31, 2025.",
    citation: "IRC 25C, 25D; OBBB",
    modeling: "reference",
    sources: [{ title: "IRS Instructions for Form 5695 (2025)", url: "https://www.irs.gov/instructions/i5695" }],
  },
  {
    id: "ty2026-premium-tax-credit-repayment",
    effectiveTaxYear: 2026,
    kind: "changed",
    title: "Premium Tax Credit repayment caps removed",
    summary: "Excess advance Premium Tax Credit must be repaid in full; the income-based repayment caps no longer apply. The 400% poverty-line limit applies again after the temporary 2021-2025 expansion.",
    citation: "IRC 36B(f)(2)(B); OBBB; Rev. Proc. 2025-25",
    modeling: "calculated",
    sources: [IRS_OBBB_PROVISIONS, { title: "Rev. Proc. 2025-25 (2026 applicable percentage table)", url: "https://www.irs.gov/pub/irs-drop/rp-25-25.pdf" }],
  },
  {
    id: "ty2026-hsa-eligibility",
    effectiveTaxYear: 2026,
    kind: "changed",
    title: "HSA-compatible bronze, catastrophic, and direct primary care plans",
    summary: "Bronze and catastrophic plans are HSA-compatible from January 1, 2026; certain direct primary care arrangements no longer disqualify HSA contributions.",
    citation: "IRC 223; OBBB",
    modeling: "reference",
    sources: [IRS_OBBB_PROVISIONS],
  },
  {
    id: "ty2026-trump-accounts",
    effectiveTaxYear: 2026,
    kind: "new",
    title: "Trump Accounts",
    summary: "Contributions began July 4, 2026: up to $5,000 per year, employer up to $2,500, plus a one-time $1,000 federal pilot deposit for eligible children.",
    citation: "IRC 530A; OBBB sec. 70204",
    modeling: "not_modeled",
    sources: [IRS_OBBB_PROVISIONS],
  },
  {
    id: "ty2026-california-indexing",
    effectiveTaxYear: 2026,
    kind: "changed",
    title: "California 2026 indexing",
    summary: "Brackets indexed 3.4% (CCPI June 2025 to June 2026); standard deduction $5,900 single, $11,800 joint.",
    citation: "Cal. Rev. & Tax. Code 17041, 17073.5",
    modeling: "calculated",
    sources: [{ title: "California FTB, Tax News October 2026", url: "https://www.ftb.ca.gov/about-ftb/newsroom/tax-news/2026/10.html" }],
  },
  {
    id: "ty2026-massachusetts-surtax-threshold",
    effectiveTaxYear: 2026,
    kind: "changed",
    title: "Massachusetts 4% surtax threshold",
    summary: "Surtax applies to taxable income above $1,107,750 for TY2026.",
    citation: "Massachusetts G.L. c. 62, s. 4",
    modeling: "calculated",
    sources: [{ title: "Massachusetts DOR, tax rates", url: "https://www.mass.gov/info-details/tax-rates" }],
  },
  {
    id: "ty2026-illinois-exemption",
    effectiveTaxYear: 2026,
    kind: "changed",
    title: "Illinois exemption allowance",
    summary: "Exemption allowance $2,925 per person; disallowed above $250,000 AGI ($500,000 MFJ).",
    citation: "35 ILCS 5/204",
    modeling: "calculated",
    sources: [{ title: "Illinois DOR, personal exemption allowance", url: "https://tax.illinois.gov/questionsandanswers/answer.851.html" }],
  },
  {
    id: "ty2026-north-carolina-rate",
    effectiveTaxYear: 2026,
    kind: "changed",
    title: "North Carolina rate cut",
    summary: "Individual income tax rate 3.99% for tax years after 2025 (4.25% for TY2025).",
    citation: "N.C. Gen. Stat. 105-153.7",
    modeling: "calculated",
    sources: [{ title: "NCDOR, tax rate schedules", url: "https://www.ncdor.gov/taxes-forms/individual-income-tax/tax-rate-schedules" }],
  },
];

/** Law changes with effectiveTaxYear in (fromYear, toYear], ordered by year. */
export function getLawChangesEffectiveBetween(fromYear: number, toYear: number): LawChange[] {
  return LAW_CHANGES
    .filter((change) => change.effectiveTaxYear > fromYear && change.effectiveTaxYear <= toYear)
    .sort((left, right) => left.effectiveTaxYear - right.effectiveTaxYear);
}
