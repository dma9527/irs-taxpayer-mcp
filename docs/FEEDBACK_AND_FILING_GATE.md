# Feedback Measurement and Filing-Engine Gate

The project does not collect telemetry. Adoption and investment evidence comes only from public, opt-in GitHub activity and explicit discovery conversations. Contributors must not request or store taxpayer PII, tax returns, exact income, addresses, account numbers, or credentials.

## Evidence sources

Use the Planner Feedback issue form and aggregate only these counters:

- `paidDemandSignals`: Unique users who select Yes for willingness to pay after describing a real planning problem.
- `discoveryInterviews`: Completed conversations using synthetic or generalized tax facts.
- `domainPartners`: CPA, Enrolled Agent, tax attorney, or tax software professional who commits to rule and fixture validation.
- `maintainerFte`: Engineering capacity committed to implementation and annual maintenance.
- `annualMaintenanceOwner`: A named owner accepts responsibility for annual IRS data, tests, security, and support readiness.

Do not count stars, anonymous downloads, duplicate issues, hypothetical interest, or conversations containing unapproved taxpayer data.

## Decision thresholds

The code-owned thresholds are in `feedback/filing-engine-gate.json`:

| Condition | Minimum |
| --- | ---: |
| Explicit paid-demand signals | 5 unique users |
| Discovery interviews | 3 |
| Tax-domain validation partners | 1 |
| Committed engineering capacity | 2 FTE |
| Named annual maintenance owner | Required |

Every condition is mandatory. Filing-grade federal work, state filing plugins, and MeF investment remain blocked when any condition is unmet.

## Monthly evaluation

Create a local aggregate file that contains counters only:

```json
{
  "paidDemandSignals": 0,
  "discoveryInterviews": 0,
  "domainPartners": 0,
  "maintainerFte": 0,
  "annualMaintenanceOwner": false
}
```

Evaluate it locally:

```bash
node scripts/evaluate-filing-gate.mjs /path/to/aggregate-metrics.json
```

The output is either `BLOCKED` with unmet fields or `READY`. BLOCKED exits with status 1 so future automation fails closed; READY exits with status 0. A READY result permits a design and staffing review. It does not itself authorize collection of taxpayer data, tax filing, or MeF transmission.

## Review discipline

- Review evidence monthly while active feedback exists.
- Link counted GitHub issues or interview notes in a private maintainer record without copying taxpayer facts.
- Require a second maintainer to verify the aggregate counts before changing the gate decision.
- Keep filing-engine, state-plugin, and MeF project cards in Todo until the evaluator returns READY and the resource commitment is documented.
