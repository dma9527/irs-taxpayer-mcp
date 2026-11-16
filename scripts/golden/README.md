# TY2026 golden worksheet cases

`worksheet_ty2026.py` works 50 synthetic TY2026 returns line by line from IRS worksheets and writes `src/golden/ty2026-golden.json`. `src/golden/ty2026-golden.test.ts` runs every case through the engine in CI and requires each value to match within $1.

The script shares no code with the engine or with PSL Tax-Calculator. It uses only Python's standard library and constants copied from Rev. Proc. 2025-32, the SSA 2026 wage base, and statute. It follows these worksheets:

- Qualified Dividends and Capital Gain Tax Worksheet (line numbers in `qdcg_tax`)
- Form 6251 Parts II and III (`amt_tax`)
- Schedule 8812 credit limit and ACTC earned-income method
- Form 2441 applicable percentage under the OBBB schedule
- Schedule SE, Form 8959, Form 8960
- Schedule 1-A (tips, overtime, vehicle loan interest, senior) and the TY2026 charitable rules

Regular tax uses the rate schedules (Tax Computation Worksheet method), not the $50-wide Tax Table, so a filed return under $100,000 of taxable income can differ by a few dollars.

Regenerate after changing a case:

```bash
python3 scripts/golden/worksheet_ty2026.py > src/golden/ty2026-golden.json
npm test
```

Each case in the JSON keeps its worksheet trace so a reviewer can follow the arithmetic.

## TY2026 state cases

`state_worksheet_ty2026.py` works 1,160 TY2026 state cases (29 states, 4 filing statuses, 10 income levels) from the published state rules and writes `src/golden/ty2026-state-golden.json`. `src/golden/ty2026-state-golden.test.ts` requires the engine to match each tax to the dollar and each taxable amount exactly. Paths the engine does not model (AZ, CO, NY, MN and RI above their phase-out limits) must fail closed.

The script shares no code with the engine. It rebuilds each graduated schedule from its floors and rates and asserts the base-tax amounts the state publishes (KS K-40ES, ND ND-1ES, RI ADV 2025-22, NE HoH schedule). `scripts/sources/check_state_sources.py` re-downloads the official sources and confirms the constants still appear in them.

```bash
python3 scripts/golden/state_worksheet_ty2026.py > src/golden/ty2026-state-golden.json
npm test
```
