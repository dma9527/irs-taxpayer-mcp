"""Differential test: local engine vs PSL Tax-Calculator on synthetic scenarios."""
import json
import subprocess
import sys
import tempfile
import warnings
from pathlib import Path

warnings.filterwarnings("ignore")
import pandas as pd
import taxcalc as tc

from scenarios import SCENARIOS, S, MFJ, MFS, HOH

MARS = {S: 1, MFJ: 2, MFS: 3, HOH: 4}
TOLERANCE = 1.0


def oracle(scenario):
    married = scenario["status"] == MFJ
    wages = scenario["wages"] + scenario["spouse_wages"]
    row = {
        "RECID": 1, "exact": 1, "MARS": MARS[scenario["status"]], "FLPDYR": scenario["year"],
        "XTOT": (2 if married else 1) + max(scenario["ctc_kids"], scenario["eitc_kids"]),
        "e00200": wages, "e00200p": scenario["wages"], "e00200s": scenario["spouse_wages"],
        "p23250": scenario["ltcg"], "e00600": scenario["odiv"], "e00650": scenario["qdiv"],
        "e18400": scenario["salt"], "e19200": scenario["mortgage"], "e19800": scenario["charity"],
        "n24": scenario["ctc_kids"], "EIC": min(scenario["eitc_kids"], 3),
        "nu13": scenario["care_kids"], "f2441": scenario["care_kids"], "e32800": scenario["care_expenses"],
        "age_head": scenario["age"], "age_spouse": scenario["spouse_age"] if married else 0,
        "tip_income": scenario["tips"], "overtime_income": scenario["overtime"],
        "auto_loan_interest": scenario["auto_interest"],
    }
    records = tc.Records(data=pd.DataFrame([row]), start_year=scenario["year"], gfactors=None, weights=None, exact_calculations=True,
                         adjust_ratios=None)
    policy = tc.Policy()
    # Law-only comparison: disable Tax-Calculator's behavioral credit take-up model.
    policy.implement_reform({"eitc_claim_prob_scale": {scenario["year"]: 9e99},
                             "actc_claim_prob_scale": {scenario["year"]: 9e99}})
    calc = tc.Calculator(policy=policy, records=records, verbose=False)
    calc.calc_all()
    get = lambda name: float(calc.array(name)[0])
    return {
        "agi": get("c00100"),
        "taxableIncome": get("c04800"),
        "taxBeforeCredits": get("c05800"),
        "amt": get("c09600"),
        "cdcc": get("c07180"),
        "ctcNonrefundable": get("c07220"),
        "actc": get("c11070"),
        "eitc": get("eitc"),
        "niit": get("niit"),
    }


def main():
    engine_script = sys.argv[1] if len(sys.argv) > 1 else str(Path(__file__).with_name("run_engine.mjs"))
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as handle:
        json.dump(SCENARIOS, handle)
        path = handle.name
    engine = json.loads(subprocess.check_output(["node", engine_script, path], text=True))
    mismatches = 0
    for scenario, local in zip(SCENARIOS, engine):
        reference = oracle(scenario)
        diffs = {key: (local[key], reference[key]) for key in reference
                 if abs(local[key] - reference[key]) > TOLERANCE}
        status = "OK  " if not diffs else "DIFF"
        mismatches += bool(diffs)
        print(f"{status} {scenario['name']}")
        for key, (ours, theirs) in diffs.items():
            print(f"       {key}: engine {ours:,.2f} vs taxcalc {theirs:,.2f} (delta {ours - theirs:,.2f})")
    print(f"\n{len(SCENARIOS) - mismatches}/{len(SCENARIOS)} scenarios match within ${TOLERANCE:.0f}")
    return 1 if mismatches else 0


sys.exit(main())
