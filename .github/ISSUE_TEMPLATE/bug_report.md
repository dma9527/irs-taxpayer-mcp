---
name: Bug Report
about: Report incorrect calculations or errors
title: "[BUG] "
labels: bug
---

> Do not include SSNs, tax returns, exact income, addresses, account numbers, or other taxpayer data. Use rounded or synthetic values.

**Tool name**: (e.g., `calculate_federal_tax`)

**Tax year**: 2024 / 2025 / 2026

**Synthetic input parameters**:

```json
{
  "taxYear": 2026,
  "filingStatus": "single",
  "grossIncome": 50000
}
```

**Expected result**:

**Actual result**:

**IRS source** (if reporting a data error):

**Version**: (run `npm list irs-taxpayer-mcp`)
