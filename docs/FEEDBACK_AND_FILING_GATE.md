# Feedback Measurement and Filing-Engine Gate

The project does not collect telemetry. Adoption and investment evidence comes only from public, opt-in GitHub activity and explicit discovery conversations. Contributors must not request or store taxpayer PII, tax returns, exact income, addresses, account numbers, or credentials.

## Evidence sources

Use the Planner Feedback issue form and aggregate only these counters:

- `paidDemandSignals`: Unique users who select Yes for willingness to pay after describing a real planning problem.
- `discoveryInterviews`: Completed conversations using synthetic or generalized tax facts.
- `domainPartners`: CPA, Enrolled Agent, tax attorney, or tax software professional who commits to rule and fixture validation.
- `maintainerFte`: Engineering capacity committed to implementation and annual maintenance.
- `annualMaintenanceOwner`: A named owner accepts responsibility for annual IRS data, tests, security, and support readiness.
- `privacyIncidents`: Confirmed privacy incidents. Any nonzero value blocks filing-engine readiness.

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
| Privacy incidents | 0 maximum |

Every condition is mandatory. Filing-grade federal work, state filing plugins, and MeF investment remain blocked when any condition is unmet.

## Monthly evaluation

Create a local aggregate file that contains counters only:

```json
{
  "paidDemandSignals": 0,
  "discoveryInterviews": 0,
  "domainPartners": 0,
  "maintainerFte": 0,
  "annualMaintenanceOwner": false,
  "privacyIncidents": 0
}
```

Evaluate it locally:

```bash
node scripts/evaluate-filing-gate.mjs /path/to/aggregate-metrics.json
```

The output is either `BLOCKED` with unmet fields or `READY`. BLOCKED exits with status 1 so future automation fails closed; READY exits with status 0. A READY result permits a design and staffing review. It does not itself authorize collection of taxpayer data, tax filing, or MeF transmission.

## Monthly dashboard

`.github/workflows/feedback-dashboard.yml` runs at 14:00 UTC on the first day of every month and supports manual execution. It updates one open issue labeled `metrics-dashboard`, adds at most one snapshot comment per calendar month, writes the same dashboard to the GitHub Actions step summary, and uploads the aggregate JSON snapshot for 90 days.

The workflow reads only issue labels, author handles, state, and timestamps. It does not read or reproduce issue bodies. Paid-demand and domain-partner counts require the maintainer-reviewed `paid-interest` and `domain-partner` labels.

Configure aggregate repository variables without taxpayer facts:

| Variable | Meaning | Initial value |
| --- | --- | ---: |
| `DISCOVERY_INTERVIEWS` | Completed privacy-safe discovery interviews | `0` |
| `MAINTAINER_FTE` | Committed engineering capacity | `0` |
| `ANNUAL_MAINTENANCE_OWNER` | Named annual owner exists | `false` |
| `PRIVACY_INCIDENTS` | Confirmed privacy incidents | `0` |

Run it manually with:

```bash
gh workflow run feedback-dashboard.yml
```

The dashboard includes adoption, reviewed demand, tax-domain partners, resolution time, bug and data-error counts, public npm downloads, privacy incidents, and the current filing-engine decision. Public npm downloads are context only and never count toward the gate.

## Review discipline

- Review evidence monthly while active feedback exists.
- Link counted GitHub issues or interview notes in a private maintainer record without copying taxpayer facts.
- Require a second maintainer to verify the aggregate counts before changing the gate decision.
- Keep filing-engine, state-plugin, and MeF project cards in Todo until the evaluator returns READY and the resource commitment is documented.
