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
