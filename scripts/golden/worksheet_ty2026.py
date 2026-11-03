"""TY2026 golden cases worked from IRS worksheets, independent of the engine and Tax-Calculator.

Every amount comes from Rev. Proc. 2025-32, Rev. Proc. 2025-19 is not used, SSA 2026 wage base, and the
statute for flat amounts (IRC 1411, 3101(b)(2), 24, 21, 63(f), 151(d)(5), 170(p), 224, 225, 163(h)(4)).
Regular tax uses the rate schedules (Tax Computation Worksheet method), not the $50 Tax Table.
Run: python3 scripts/golden/worksheet_ty2026.py > src/golden/ty2026-golden.json
"""
import json
import math

S, MFJ, MFS, HOH = "single", "married_filing_jointly", "married_filing_separately", "head_of_household"

# Rev. Proc. 2025-32 sec. 4.01 rate schedules: (upper bound, rate).
BRACKETS = {
    S: [(12400, .10), (50400, .12), (105700, .22), (201775, .24), (256225, .32), (640600, .35), (math.inf, .37)],
    MFJ: [(24800, .10), (100800, .12), (211400, .22), (403550, .24), (512450, .32), (768700, .35), (math.inf, .37)],
    MFS: [(12400, .10), (50400, .12), (105700, .22), (201775, .24), (256225, .32), (384350, .35), (math.inf, .37)],
    HOH: [(17700, .10), (67450, .12), (105700, .22), (201750, .24), (256200, .32), (640600, .35), (math.inf, .37)],
}
STANDARD = {S: 16100, MFJ: 32200, MFS: 16100, HOH: 24150}            # sec. 4.14(1)
AGED = {S: 2050, HOH: 2050, MFJ: 1650, MFS: 1650}                     # sec. 4.14(3)
ZERO_RATE_MAX = {S: 49450, MFJ: 98900, MFS: 49450, HOH: 66200}        # sec. 4.03
FIFTEEN_RATE_MAX = {S: 545500, MFJ: 613700, MFS: 306850, HOH: 579600}
AMT_EXEMPTION = {S: 90100, HOH: 90100, MFJ: 140200, MFS: 70100}       # sec. 4.10
AMT_PHASEOUT = {S: 500000, HOH: 500000, MFJ: 1000000, MFS: 500000}
AMT_28_THRESHOLD = {S: 244500, HOH: 244500, MFJ: 244500, MFS: 122250}
HIGH_INCOME_THRESHOLD = {S: 200000, HOH: 200000, MFJ: 250000, MFS: 125000}  # IRC 1411(b), 3101(b)(2)
CTC_PHASEOUT = {S: 200000, HOH: 200000, MFS: 200000, MFJ: 400000}     # IRC 24(h)(3)
WAGE_BASE = 184500                                                    # SSA 2026 contribution and benefit base


def schedule_tax(income, status):
    tax, lower = 0.0, 0
    for upper, rate in BRACKETS[status]:
        if income <= lower:
            break
        tax += (min(income, upper) - lower) * rate
        lower = upper
    return tax


def qdcg_tax(taxable, preferential, status):
    """Qualified Dividends and Capital Gain Tax Worksheet, line numbers in comments."""
    line4 = preferential
    line5 = max(0, taxable - line4)
    line7 = min(taxable, ZERO_RATE_MAX[status])
    line8 = min(line5, line7)
    line9 = line7 - line8                                   # taxed at 0%
    line10 = min(taxable, line4)
    line12 = line10 - line9
    line14 = min(taxable, FIFTEEN_RATE_MAX[status])
    line16 = max(0, line14 - (line5 + line9))
    line17 = min(line12, line16)                            # taxed at 15%
    line20 = taxable - (line5 + line9 + line17)             # taxed at 20%
    line24 = schedule_tax(line5, status) + line17 * .15 + line20 * .20
    return min(line24, schedule_tax(taxable, status))


def amt_tax(amti, preferential, regular_ordinary, status, regular_tax):
    """Form 6251 Part II lines 4 to 11 and Part III lines 12 to 40."""
    exemption = max(0, AMT_EXEMPTION[status] - .5 * max(0, amti - AMT_PHASEOUT[status]))
    line12 = max(0, amti - exemption)
    if line12 == 0:
        return 0.0
    threshold = AMT_28_THRESHOLD[status]
    flat = lambda amount: amount * .26 if amount <= threshold else amount * .28 - threshold * .02
    line13 = preferential
    line16 = min(line12, line13)
    line18 = flat(line12 - line16)
    line20 = max(0, ZERO_RATE_MAX[status] - regular_ordinary)
    line21 = min(line12, line13)
    line22 = min(line20, line21)                            # 0%
    line23 = line21 - line22
    line28 = max(0, FIFTEEN_RATE_MAX[status] - (line20 + regular_ordinary))
    line29 = min(line23, line28)                            # 15%
    line35 = line21 - line22 - line29                       # 20%
    line39 = line18 + line29 * .15 + line35 * .20
    line40 = min(line39, flat(line12))
    return max(0.0, line40 - regular_tax)


def salt_cap(status, magi):
    cap, floor, start = (20200, 5000, 252500) if status == MFS else (40400, 10000, 505000)
    return max(floor, cap - .3 * max(0, magi - start))


def dependent_care_rate(agi, status):
    points = max(35, 50 - math.ceil(max(0, agi - 15000) / 2000))
    start, step = (150000, 4000) if status == MFJ else (75000, 2000)
    return max(20, points - math.ceil(max(0, agi - start) / step)) / 100


def eitc(earned, agi, status, children):
    # sec. 4.06 table: earned income amount, max credit, phase-in and phase-out rates.
    table = {0: (8680, 664, .0765, .0765), 1: (13020, 4427, .34, .1598), 2: (18290, 7316, .40, .2106), 3: (18290, 8231, .45, .2106)}
    amount, maximum, _, rate = table[min(children, 3)]
    start = (31160 if children else 18140) if status == MFJ else (23890 if children else 10860)
    phase_in = min(earned, amount) * table[min(children, 3)][2]
    return max(0.0, min(phase_in, maximum - rate * max(0, max(agi, earned) - start)))


def work(case):
    f = {"wages": 0, "se": 0, "interest": 0, "odiv": 0, "qdiv": 0, "ltcg": 0, "kids": 0, "age65": False,
         "spouse65": False, "tips": 0, "overtime": 0, "vehicle": 0, "salt": 0, "mortgage": 0, "charity": 0,
         "cash_charity": 0, "care": 0, "care_kids": 0, "spouse_wages": 0, "eitc_kids": None, **case}
    st = f["status"]
    lines = []
    net_se = f["se"] * .9235
    ss_room = max(0, WAGE_BASE - f["wages"])
    se_tax = min(net_se, ss_room) * .124 + net_se * .029 if f["se"] else 0.0
    agi = f["wages"] + f["se"] + f["interest"] + f["odiv"] + f["ltcg"] - se_tax / 2
    lines.append(f"AGI {agi:,.2f}" + (f" after half SE tax {se_tax / 2:,.2f}" if se_tax else ""))

    standard = STANDARD[st] + AGED[st] * (f["age65"] + f["spouse65"])
    itemized = 0.0
    if f["salt"] or f["mortgage"] or f["charity"]:
        capped = min(f["salt"], salt_cap(st, agi))
        floor = min(f["charity"], agi * .005)
        top_start = BRACKETS[st][-2][0]
        before_limit = capped + f["mortgage"] + f["charity"] - floor
        itemized = before_limit - 2 / 37 * min(before_limit, max(0, agi - top_start))
        lines.append(f"Schedule A: SALT {capped:,.2f}, charity floor {floor:,.2f}, after 2/37 {itemized:,.2f}")
    use_itemized = itemized > standard
    deduction = itemized if use_itemized else standard
    non_itemizer = 0 if use_itemized else min(f["cash_charity"], 2000 if st == MFJ else 1000)

    step = lambda threshold: math.floor(max(0, agi - threshold) / 1000) * 100
    joint = st == MFJ
    tips = max(0, min(f["tips"], 25000) - step(300000 if joint else 150000))
    overtime = max(0, min(f["overtime"], 25000 if joint else 12500) - step(300000 if joint else 150000))
    vehicle = max(0, min(f["vehicle"], 10000) - math.ceil(max(0, agi - (200000 if joint else 100000)) / 1000) * 200)
    seniors = f["age65"] + f["spouse65"]
    senior = seniors * max(0, 6000 - .06 * max(0, agi - (150000 if joint else 75000)))
    schedule_1a = tips + overtime + vehicle + senior
    taxable = max(0, agi - deduction - non_itemizer - schedule_1a)
    lines.append(f"Deduction {deduction:,.2f} ({'itemized' if use_itemized else 'standard'}), "
                 f"non-itemizer charity {non_itemizer:,.2f}, Schedule 1-A {schedule_1a:,.2f}, taxable {taxable:,.2f}")

    preferential = min(f["qdiv"] + f["ltcg"], taxable)
    regular = qdcg_tax(taxable, preferential, st)
    # Form 6251 line 2a adds back itemized SALT or the standard deduction; IRC 56(b)(1)(E) disallows the 151 senior deduction.
    amti = taxable + (min(f["salt"], salt_cap(st, agi)) if use_itemized else standard) + senior
    amt = amt_tax(amti, preferential, taxable - preferential, st, regular)
    lines.append(f"Regular tax {regular:,.2f}, AMTI {amti:,.2f}, AMT {amt:,.2f}")

    earned = f["wages"] + f["se"] - se_tax / 2
    care_limit = (6000 if f["care_kids"] >= 2 else 3000) if f["care_kids"] else 0
    # IRC 21(d): joint expenses are also capped by the lower-earning spouse's earned income.
    earned_cap = min(earned - f["spouse_wages"], f["spouse_wages"]) if st == MFJ else earned
    care_credit = min(f["care"], care_limit, earned_cap) * dependent_care_rate(agi, st) if f["care_kids"] else 0.0
    care_credit = min(care_credit, regular + amt)
    ctc_full = f["kids"] * 2200 - math.ceil(max(0, agi - CTC_PHASEOUT[st]) / 1000) * 50
    ctc_full = max(0, ctc_full)
    ctc = min(ctc_full, regular + amt - care_credit)
    actc = min(ctc_full - ctc, f["kids"] * 1700, max(0, earned - 2500) * .15)
    lines.append(f"Care credit {care_credit:,.2f}, CTC {ctc:,.2f}, ACTC {actc:,.2f}")

    medicare_threshold = HIGH_INCOME_THRESHOLD[st]
    additional_medicare = .009 * (max(0, f["wages"] - medicare_threshold)
                                  + max(0, net_se - max(0, medicare_threshold - f["wages"])))
    nii = f["interest"] + f["odiv"] + f["ltcg"]
    niit = .038 * min(nii, max(0, agi - HIGH_INCOME_THRESHOLD[st]))
    total = regular + amt - care_credit - ctc + se_tax + additional_medicare + niit - actc
    lines.append(f"SE tax {se_tax:,.2f}, Additional Medicare {additional_medicare:,.2f}, NIIT {niit:,.2f}, total {total:,.2f}")

    eitc_kids = f["eitc_kids"]
    expected = {
        "adjustedGrossIncome": round(agi, 2), "taxableIncome": round(taxable, 2), "amt": round(amt, 2),
        "dependentCareCredit": round(care_credit, 2), "childTaxCredit": round(ctc, 2),
        "additionalChildTaxCredit": round(actc), "selfEmploymentTax": round(se_tax, 2),
        "additionalMedicareTax": round(additional_medicare, 2), "niit": round(niit, 2),
        "totalFederalTax": round(total, 2),
    }
    if eitc_kids is not None:
        expected["eitc"] = round(eitc(earned, agi, st, eitc_kids), 2)
    return {"name": f["name"], "facts": {k: v for k, v in case.items() if k != "name"}, "expected": expected, "worksheet": lines}


C = lambda name, status, **facts: {"name": name, "status": status, **facts}
CASES = [
    C("single wages 20k", S, wages=20000, eitc_kids=0),
    C("single wages 55k", S, wages=55000),
    C("single wages 120k", S, wages=120000),
    C("single wages 250k", S, wages=250000),
    C("single wages 700k", S, wages=700000),
    C("mfj wages 40k", MFJ, wages=40000),
    C("mfj wages 130k", MFJ, wages=130000),
    C("mfj wages 300k", MFJ, wages=300000),
    C("mfj wages 600k", MFJ, wages=600000),
    C("mfj wages 900k", MFJ, wages=900000),
    C("hoh wages 30k", HOH, wages=30000),
    C("hoh wages 90k", HOH, wages=90000),
    C("hoh wages 300k", HOH, wages=300000),
    C("mfs wages 80k", MFS, wages=80000),
    C("mfs wages 450k", MFS, wages=450000),
    C("single 0% band LTCG", S, wages=40000, ltcg=10000),
    C("single qualified dividends", S, wages=100000, odiv=60000, qdiv=50000),
    C("mfj LTCG straddles 0% and 15%", MFJ, wages=80000, ltcg=60000),
    C("mfj LTCG at 20% with NIIT", MFJ, wages=500000, ltcg=200000),
    C("hoh LTCG", HOH, wages=50000, ltcg=30000),
    C("single large LTCG", S, wages=30000, ltcg=600000),
    C("mfj 2 kids 60k", MFJ, wages=60000, kids=2, eitc_kids=2),
    C("hoh 2 kids 25k ACTC", HOH, wages=25000, kids=2, eitc_kids=2),
    C("single 1 kid 15k ACTC", S, wages=15000, kids=1, eitc_kids=1),
    C("mfj 2 kids CTC phase-out", MFJ, wages=420000, kids=2),
    C("mfj 3 kids partial CTC", MFJ, wages=450500, kids=3),
    C("hoh 1 kid CTC fraction", HOH, wages=210001, kids=1),
    C("single SE 50k", S, se=50000),
    C("single SE 200k", S, se=200000),
    C("mfj W-2 150k SE 60k", MFJ, wages=150000, se=60000),
    C("single W-2 190k SE 30k", S, wages=190000, se=30000),
    C("single wages and interest NIIT", S, wages=260000, interest=20000),
    C("mfj wages 270k", MFJ, wages=270000),
    C("mfs wages 150k", MFS, wages=150000),
    C("single senior 60k", S, wages=60000, age65=True),
    C("single senior 90k phase-out", S, wages=90000, age65=True),
    C("mfj two seniors 100k", MFJ, wages=100000, age65=True, spouse65=True),
    C("single tips 50k", S, wages=50000, tips=10000),
    C("single overtime 160.5k", S, wages=160500, overtime=5000),
    C("mfj overtime 200k", MFJ, wages=200000, overtime=25000),
    C("single vehicle interest 100.5k", S, wages=100500, vehicle=3000),
    C("single non-itemizer charity", S, wages=70000, cash_charity=1500),
    C("mfj non-itemizer charity", MFJ, wages=120000, cash_charity=2500),
    C("mfj itemized charity floor", MFJ, wages=300000, salt=30000, mortgage=20000, charity=10000),
    C("mfj SALT phase-down 600k", MFJ, wages=600000, salt=50000, mortgage=30000),
    C("mfs SALT cap", MFS, wages=150000, salt=30000, mortgage=12000),
    C("mfj 2/37 limit 1.1M", MFJ, wages=1100000, salt=10000, mortgage=40000, charity=50000),
    C("mfj care 2 kids 150k", MFJ, wages=150000, spouse_wages=60000, kids=2, care=8000, care_kids=2),
    C("hoh care 1 kid 45k", HOH, wages=45000, kids=1, care=5000, care_kids=1, eitc_kids=1),
    C("single care 1 kid 30k", S, wages=30000, kids=1, care=3000, care_kids=1),
]

if __name__ == "__main__":
    print(json.dumps({"taxYear": 2026, "cases": [work(case) for case in CASES]}, indent=2))
