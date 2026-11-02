"""Synthetic scenarios shared by the Tax-Calculator oracle and the local engine runner."""
import json

S, MFJ, MFS, HOH = "single", "married_filing_jointly", "married_filing_separately", "head_of_household"

def sc(name, year, status, wages=0, spouse_wages=0, ltcg=0, qdiv=0, odiv=0, salt=0, mortgage=0, charity=0,
       ctc_kids=0, eitc_kids=0, care_kids=0, care_expenses=0, age=40, spouse_age=40, tips=0, overtime=0,
       auto_interest=0):
    return dict(name=name, year=year, status=status, wages=wages, spouse_wages=spouse_wages, ltcg=ltcg,
                qdiv=qdiv, odiv=odiv, salt=salt, mortgage=mortgage, charity=charity, ctc_kids=ctc_kids,
                eitc_kids=eitc_kids, care_kids=care_kids, care_expenses=care_expenses, age=age,
                spouse_age=spouse_age, tips=tips, overtime=overtime, auto_interest=auto_interest)

SCENARIOS = [
    sc("single wages 30k", 2026, S, 30000),
    sc("single wages 60k", 2026, S, 60000),
    sc("single wages 100k", 2026, S, 100000),
    sc("single wages 250k", 2026, S, 250000),
    sc("single wages 700k", 2026, S, 700000),
    sc("single wages 1.2M", 2026, S, 1200000),
    sc("mfj wages 80k", 2026, MFJ, 50000, 30000),
    sc("mfj wages 150k", 2026, MFJ, 90000, 60000),
    sc("mfj wages 400k", 2026, MFJ, 250000, 150000),
    sc("mfj wages 1.5M", 2026, MFJ, 1000000, 500000),
    sc("mfs wages 150k", 2026, MFS, 150000),
    sc("hoh 2 kids 45k", 2026, HOH, 45000, ctc_kids=2, eitc_kids=2),
    sc("hoh 2 kids 120k", 2026, HOH, 120000, ctc_kids=2, eitc_kids=2),
    sc("mfj 2 kids 90k", 2026, MFJ, 60000, 30000, ctc_kids=2, eitc_kids=2),
    sc("mfj 2 kids 450k ctc phaseout", 2026, MFJ, 300000, 150000, ctc_kids=2, eitc_kids=2),
    sc("single 3 kids eitc 25k", 2026, HOH, 25000, ctc_kids=3, eitc_kids=3),
    sc("single 0 kids eitc 12k", 2026, S, 12000),
    sc("single wages 60k + ltcg 50k", 2026, S, 60000, ltcg=50000),
    sc("single ltcg 900k + wages 100k", 2026, S, 100000, ltcg=900000),
    sc("single qualified dividends", 2026, S, 100000, qdiv=15000, odiv=20000),
    sc("mfj wages 900k + ltcg 300k", 2026, MFJ, 600000, 300000, ltcg=300000),
    sc("mfj itemizer 300k", 2026, MFJ, 200000, 100000, salt=30000, mortgage=25000, charity=10000),
    sc("mfj itemizer 1.2M section 68", 2026, MFJ, 800000, 400000, salt=50000, mortgage=40000, charity=50000),
    sc("single itemizer 700k section 68", 2026, S, 700000, salt=45000, mortgage=30000, charity=20000),
    sc("single nonitemizer charity 1.5k", 2026, S, 80000, charity=1500),
    sc("mfj nonitemizer charity 5k", 2026, MFJ, 70000, 50000, charity=5000),
    sc("hoh cdcc 1 kid 40k", 2026, HOH, 40000, ctc_kids=1, eitc_kids=1, care_kids=1, care_expenses=4000),
    sc("mfj cdcc 2 kids 200k", 2026, MFJ, 120000, 80000, ctc_kids=2, eitc_kids=2, care_kids=2, care_expenses=10000),
    sc("mfj cdcc 2 kids 100k", 2026, MFJ, 60000, 40000, ctc_kids=2, eitc_kids=2, care_kids=2, care_expenses=8000),
    sc("single 2025 wages 100k", 2025, S, 100000),
    sc("mfj 2025 2 kids 200k cdcc", 2025, MFJ, 120000, 80000, ctc_kids=2, eitc_kids=2, care_kids=2, care_expenses=10000),
    sc("single 2025 ltcg 900k", 2025, S, 100000, ltcg=900000),
    sc("mfj 2025 itemizer 600k", 2025, MFJ, 400000, 200000, salt=30000, mortgage=30000, charity=20000),
    sc("single senior 60k", 2026, S, 60000, age=70),
    sc("single senior 90k", 2026, S, 90000, age=70),
    sc("mfj two seniors 200k", 2026, MFJ, 120000, 80000, age=70, spouse_age=68),
    sc("mfj one senior 120k", 2026, MFJ, 60000, 60000, age=70, spouse_age=60),
    sc("single tips 160.5k", 2026, S, 160500, tips=20000),
    sc("mfj overtime 310k", 2026, MFJ, 200000, 110000, overtime=30000),
    sc("single auto interest 100.5k", 2026, S, 100500, auto_interest=3000),
    sc("single 2025 senior tips 70k", 2025, S, 70000, age=66, tips=8000),
    sc("hoh SALT add-back triggers AMT", 2026, HOH, 240000, ltcg=300000, salt=60000, mortgage=5000),
    sc("single SALT add-back with LTCG", 2026, S, 300000, ltcg=300000, salt=60000, mortgage=5000),
]

if __name__ == "__main__":
    print(json.dumps(SCENARIOS))
