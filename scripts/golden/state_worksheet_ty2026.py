"""Work TY2026 state income tax cases from official state rules and print the golden fixture JSON.

Shares no code with the engine. Constants are transcribed from the cited sources; graduated
schedules are also checked against the base-tax amounts each state publishes.

    python3 scripts/golden/state_worksheet_ty2026.py > src/golden/ty2026-state-golden.json
"""
import json
import math

STATUSES = ["single", "married_filing_jointly", "married_filing_separately", "head_of_household"]
INCOMES = [0, 9000, 15000, 30000, 45000, 85000, 150000, 240000, 600000, 1500000]
# Rev. Proc. 2025-32 standard deductions, used to derive federal taxable income for ND cases.
FEDERAL_STANDARD_DEDUCTION = {"single": 16100, "married_filing_jointly": 32200, "married_filing_separately": 16100, "head_of_household": 24150}
NO_TAX = ["AK", "FL", "NH", "NV", "SD", "TN", "TX", "WA", "WY"]
# States whose 2025 forms or revenue department pages subtract federally taxable Social Security benefits.
SOCIAL_SECURITY_EXCLUDED = ["CA", "GA", "IL", "IN", "KY", "MA", "MI", "NC", "NJ", "OH", "PA", "VA"]
TAXABLE_SOCIAL_SECURITY = 20000
# RCW 82.87.150 never lowers the Washington standard deduction ($278,000 for 2025, WA DOR).
WA_NO_TAX_LONG_TERM_GAIN = 278000
UNSUPPORTED = ["AZ", "CO", "NY"]

S, J, M, H = STATUSES


def schedule(*rows):
    """Rows of (floor, rate); returns (floor, base, rate) with base accumulated at each floor."""
    out, base = [], 0.0
    for index, (floor, rate) in enumerate(rows):
        if index:
            prev_floor, _, prev_rate = out[-1]
            base += (floor - prev_floor) * prev_rate
        out.append((floor, base, rate))
    return out


def schedule_tax(income, table):
    floor, base, rate = [row for row in table if income >= row[0]][-1]
    return base + (income - floor) * rate


def check(table, published, label):
    for floor, amount in published:
        computed = schedule_tax(floor, table)
        assert abs(computed - amount) < 0.01, f"{label} at {floor}: {computed} vs published {amount}"


# California FTB Tax News, October 2026; 1% Mental Health Services Tax above $1,000,000 (R&TC 17043).
CA = {
    S: schedule((0, .01), (11456, .02), (27157, .04), (42861, .06), (59498, .08), (75197, .093), (384109, .103), (460927, .113), (768213, .123), (1000000, .133)),
    J: schedule((0, .01), (22912, .02), (54314, .04), (85722, .06), (118996, .08), (150394, .093), (768218, .103), (921854, .113), (1000000, .123), (1536426, .133)),
    H: schedule((0, .01), (22927, .02), (54316, .04), (70018, .06), (86654, .08), (102356, .093), (522385, .103), (626864, .113), (1000000, .123), (1044771, .133)),
}
CA[M] = CA[S]
# Minnesota DOR press release, December 16, 2025.
MN = {
    S: schedule((0, .0535), (33310, .068), (109430, .0785), (203150, .0985)),
    J: schedule((0, .0535), (48700, .068), (193480, .0785), (337930, .0985)),
    H: schedule((0, .0535), (41010, .068), (164800, .0785), (270060, .0985)),
    M: schedule((0, .0535), (24350, .068), (96740, .0785), (168965, .0985)),
}
# Kansas 2026 Form K-40ES: "$1,196 plus 5.58%" over $23,000; "$2,392 plus 5.58%" over $46,000.
KS = {S: schedule((0, .052), (23000, .0558)), J: schedule((0, .052), (46000, .0558))}
KS[M] = KS[H] = KS[S]
check(KS[S], [(23000, 1196)], "KS single")
check(KS[J], [(46000, 2392)], "KS joint")
# North Dakota 2026 Form ND-1ES rate schedules.
ND = {
    S: schedule((0, 0), (49575, .0195), (250400, .025)),
    J: schedule((0, 0), (82800, .0195), (304850, .025)),
    M: schedule((0, 0), (41400, .0195), (152425, .025)),
    H: schedule((0, 0), (66400, .0195), (277600, .025)),
}
check(ND[S], [(250400, 3916.09)], "ND single")
check(ND[J], [(304850, 4329.98)], "ND joint")
check(ND[M], [(152425, 2164.99)], "ND separate")
check(ND[H], [(277600, 4118.40)], "ND head")
# Rhode Island ADV 2025-22 uniform schedule.
RI = schedule((0, .0375), (82050, .0475), (186450, .0599))
check(RI, [(82050, 3076.88), (186450, 8035.88)], "RI")
# Nebraska Rate Chronologies Rev. 2-2026 and draft 2026 Tax Calculation Schedule (HoH).
NE = {
    S: schedule((0, .0246), (4130, .0351), (24760, .0455)),
    J: schedule((0, .0246), (8250, .0351), (49530, .0455)),
    H: schedule((0, .0246), (7700, .0351), (39620, .0455)),
}
NE[M] = NE[S]
check(NE[H], [(7700, 189.42), (39620, 1309.81), (59160, 2198.88)], "NE head")
# NJ 2026 NJ-1040-ES Table A (single, MFS) and Table B (MFJ, HoH).
NJ_A = schedule((0, .014), (20000, .0175), (35000, .035), (40000, .05525), (75000, .0637), (500000, .0897), (1000000, .1075))
NJ_B = schedule((0, .014), (20000, .0175), (50000, .0245), (70000, .035), (80000, .05525), (150000, .0637), (500000, .0897), (1000000, .1075))
NJ = {S: NJ_A, M: NJ_A, J: NJ_B, H: NJ_B}
# Code of Virginia 58.1-320, one schedule for every status.
VA = schedule((0, .02), (3000, .03), (5000, .05), (17000, .0575))
# Massachusetts 5% plus the 4% surtax above $1,107,750 (TY2026).
MA = schedule((0, .05), (1107750, .09))


def persons(status):
    return 2 if status == J else 1


def by_status(status, single, joint, head=None, separate=None):
    return {S: single, J: joint, H: single if head is None else head, M: single if separate is None else separate}[status]


def work(state, status, income, agi=None):
    """Return (tax, adjustedIncome, worksheet lines) or raise LookupError when the path is not modeled."""
    lines = []
    if state in NO_TAX:
        return 0, income, ["No broad individual income tax"]
    if state in UNSUPPORTED:
        raise LookupError("no TY2026 profile")

    def flat(rate, deduction, label):
        taxable = max(0, income - deduction)
        lines.append(f"{label}: ({income} - {deduction}) x {rate} on {taxable}")
        return taxable * rate, taxable

    if state == "CA":
        deduction = by_status(status, 5900, 11800, head=11800)
        taxable = max(0, income - deduction)
        lines.append(f"FTB standard deduction {deduction}; Schedule {dict(single='X', married_filing_separately='X', married_filing_jointly='Y', head_of_household='Z')[status]} on {taxable}")
        # FTB Tax News 10/2026 exemption credit; 2025 Form 540 line 32 AGI limitation worksheet ($6 per exemption per step).
        exemptions = 2 if status == J else 1
        credit = 158 * exemptions
        threshold = {S: 252203, M: 252203, J: 504411, H: 378310}[status]
        step = 1250 if status == M else 2500
        federal_agi = income if agi is None else agi
        steps = max(0, math.ceil((federal_agi - threshold) / step)) if federal_agi > threshold else 0
        credit = max(0, credit - 6 * exemptions * steps)
        lines.append(f"Exemption credit {credit}")
        return max(0, schedule_tax(taxable, CA[status]) - credit), taxable, lines
    if state == "MA":
        deduction = by_status(status, 4400, 8800, head=6800)
        taxable = max(0, income - deduction)
        lines.append(f"MGL c.62 s.3 exemption {deduction}; 5% plus 4% above 1,107,750 on {taxable}")
        return schedule_tax(taxable, MA), taxable, lines
    if state == "IL":
        limit = 500000 if status == J else 250000
        deduction = 2925 * persons(status) if income <= limit else 0
        tax, taxable = flat(.0495, deduction, f"IL exemption {deduction} (limit {limit})")
        return tax, taxable, lines
    if state == "PA":
        tax, taxable = flat(.0307, 0, "PA no deduction")
        return tax, taxable, lines
    if state == "NC":
        tax, taxable = flat(.0399, by_status(status, 12750, 25500, head=19125), "NC standard deduction")
        return tax, taxable, lines
    if state == "MI":
        tax, taxable = flat(.0425, 5900 * persons(status), "MI exemption")
        return tax, taxable, lines
    if state == "IN":
        tax, taxable = flat(.0295, 1000 * persons(status), "IN exemption")
        return tax, taxable, lines
    if state == "KY":
        tax, taxable = flat(.035, 3360, "KY standard deduction")
        return tax, taxable, lines
    if state == "GA":
        tax, taxable = flat(.0499, by_status(status, 15000, 30000), "GA standard deduction")
        return tax, taxable, lines
    if state == "OH":
        per_person = 2400 if income <= 40000 else 2150 if income <= 80000 else 1900 if income < 500000 else 0
        exemption = per_person * persons(status)
        taxable = max(0, income - exemption)
        tax = 0 if taxable <= 26050 else 332 + (taxable - 26050) * .0275
        lines.append(f"ORC 5747.025 exemption {per_person} x {persons(status)}; 5747.02 $332 plus 2.75% above 26,050 on {taxable}")
        return tax, taxable, lines
    if state == "VA":
        deduction = by_status(status, 8750, 17500) + 930 * persons(status)
        taxable = max(0, income - deduction)
        lines.append(f"VA standard deduction plus $930 exemptions = {deduction}; 58.1-320 on {taxable}")
        return schedule_tax(taxable, VA), taxable, lines
    if state == "MN":
        if income > (110325 if status == M else 220650):
            raise LookupError("standard deduction reduction not modeled")
        deduction = by_status(status, 15300, 30600, head=23000)
        taxable = max(0, income - deduction)
        lines.append(f"MN standard deduction {deduction}; {status} brackets on {taxable}")
        return schedule_tax(taxable, MN[status]), taxable, lines
    if state == "KS":
        deduction = by_status(status, 3605, 8240, head=6180, separate=4120) + by_status(status, 9160, 18320)
        taxable = max(0, income - deduction)
        lines.append(f"KS standard deduction plus exemption = {deduction}; K-40ES schedule on {taxable}")
        return schedule_tax(taxable, KS[status]), taxable, lines
    if state == "ND":
        taxable = max(0, income - FEDERAL_STANDARD_DEDUCTION[status])
        lines.append(f"Federal taxable income {taxable}; ND-1ES {status} schedule")
        return schedule_tax(taxable, ND[status]), taxable, lines
    if state == "MS":
        deduction = by_status(status, 2300, 4600, head=3400) + by_status(status, 6000, 12000, head=8000)
        taxable = max(0, income - deduction)
        lines.append(f"MS standard deduction plus exemption = {deduction}; 4% above 10,000 on {taxable}")
        return max(0, taxable - 10000) * .04, taxable, lines
    if state == "RI":
        if income > 261000:
            raise LookupError("deduction phase-out not modeled")
        deduction = by_status(status, 11200, 22400, head=16800) + 5250 * persons(status)
        taxable = max(0, income - deduction)
        lines.append(f"RI standard deduction plus exemptions = {deduction}; ADV 2025-22 schedule on {taxable}")
        return schedule_tax(taxable, RI), taxable, lines
    if state == "NE":
        deduction = by_status(status, 8850, 17700, head=12950)
        taxable = max(0, income - deduction)
        gross = schedule_tax(taxable, NE[status])
        credit = 176 * persons(status)
        lines.append(f"NE standard deduction {deduction}; schedule tax {gross:.2f} less ${credit} personal credit")
        return max(0, gross - credit), taxable, lines
    if state == "NJ":
        deduction = 1000 * persons(status)
        taxable = max(0, income - deduction)
        lines.append(f"NJ exemption {deduction}; Table {'B' if status in (J, H) else 'A'} on {taxable}")
        return schedule_tax(taxable, NJ[status]), taxable, lines
    raise KeyError(state)


STATES = NO_TAX + ["CA", "GA", "IL", "IN", "KS", "KY", "MA", "MI", "MN", "MS", "NC", "ND", "NE", "NJ", "OH", "PA", "RI", "VA"] + UNSUPPORTED

cases = []
for state in STATES:
    for status in STATUSES:
        for income in INCOMES:
            facts = {"state": state, "status": status, "income": income}
            if state == "ND":
                facts["federalTaxableIncome"] = max(0, income - FEDERAL_STANDARD_DEDUCTION[status])
            try:
                tax, adjusted, lines = work(state, status, income)
                expected = {"tax": math.floor(tax + 0.5), "adjustedIncome": adjusted}
            except LookupError as error:
                expected, lines = {"unsupported": True}, [f"Fails closed: {error}"]
            cases.append({"name": f"{state} {status} {income}", "facts": facts, "expected": expected, "worksheet": lines})
            if state in NO_TAX or state in UNSUPPORTED or income < TAXABLE_SOCIAL_SECURITY:
                continue
            ss_facts = {**facts, "taxableSocialSecurityBenefits": TAXABLE_SOCIAL_SECURITY}
            if state not in SOCIAL_SECURITY_EXCLUDED:
                ss_expected, ss_lines = {"unsupported": True}, ["Fails closed: Social Security treatment not modeled"]
            else:
                try:
                    tax, adjusted, ss_lines = work(state, status, income - TAXABLE_SOCIAL_SECURITY, agi=income)
                    ss_expected = {"tax": math.floor(tax + 0.5), "adjustedIncome": adjusted}
                    ss_lines = [f"Subtract taxable Social Security {TAXABLE_SOCIAL_SECURITY}"] + ss_lines
                except LookupError as error:
                    ss_expected, ss_lines = {"unsupported": True}, [f"Fails closed: {error}"]
            cases.append({"name": f"{state} {status} {income} with Social Security", "facts": ss_facts,
                          "expected": ss_expected, "worksheet": ss_lines})

for gain, expected in [(WA_NO_TAX_LONG_TERM_GAIN, {"tax": 0, "adjustedIncome": 400000}), (WA_NO_TAX_LONG_TERM_GAIN + 1, {"unsupported": True})]:
    cases.append({"name": f"WA single 400000 with long-term gain {gain}",
                  "facts": {"state": "WA", "status": "single", "income": 400000, "netLongTermCapitalGain": gain},
                  "expected": expected, "worksheet": ["Washington capital gains excise boundary"]})

print(json.dumps({"taxYear": 2026, "cases": cases}, indent=1))
