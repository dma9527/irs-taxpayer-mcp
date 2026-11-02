# Differential test against PSL Tax-Calculator

This optional check runs 53 synthetic federal scenarios through the local engine and through [PSL Tax-Calculator](https://github.com/PSLmodels/Tax-Calculator) 6.8.5, then compares AGI, taxable income, tax before credits, AMT, the dependent care credit, CTC, ACTC, EITC, and NIIT within $1. It does not run in CI because it needs a Python environment.

Tax-Calculator runs with `exact_calculations=True`. Its EITC and ACTC take-up model is disabled, so the comparison checks law rather than behavior. The scenarios cover TY2024 through TY2026 and contain no taxpayer data.

## Run

```bash
npm run build
python3 -m venv .venv-taxcalc
.venv-taxcalc/bin/pip install -r scripts/differential/requirements.txt
.venv-taxcalc/bin/python scripts/differential/diff_taxcalc.py
```

The script exits with status 1 when any scenario differs by more than $1. Add new cases to `scenarios.py`.

## Scope

A match means two independent implementations agree. It does not replace checks against IRS publications, because both models can share the same misreading of a rule. Areas outside these scenarios, such as state tax, the Premium Tax Credit, and the planning tools, stay covered by unit tests with official citations.
