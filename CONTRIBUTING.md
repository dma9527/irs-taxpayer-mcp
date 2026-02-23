# Contributing to irs-taxpayer-mcp

Thanks for your interest in improving this project! Here's how to help.

## Reporting Issues

- **Calculation error**: Use the [Bug Report](https://github.com/dma9527/irs-taxpayer-mcp/issues/new?template=bug_report.md) template. Include the tool name, inputs, expected vs actual result, and IRS source if possible.
- **Incorrect tax data**: Use the [Data Error](https://github.com/dma9527/irs-taxpayer-mcp/issues/new?template=data_error.md) template. Always include the IRS source (Revenue Procedure, Notice, or official page).
- **Feature request**: Use the [Feature Request](https://github.com/dma9527/irs-taxpayer-mcp/issues/new?template=feature_request.md) template.

## Development Setup

```bash
git clone https://github.com/dma9527/irs-taxpayer-mcp.git
cd irs-taxpayer-mcp
npm install
npm test        # run tests
npm run build   # compile TypeScript
npm run dev     # development mode (tsx)
```

## Pull Request Guidelines

1. **Tests required** — add or update tests for any calculation changes
2. **IRS sources required** — cite Revenue Procedures or IRC sections for data changes
3. **No `any` types** — TypeScript strict mode, no exceptions
4. **Build must pass** — `npm run build && npm test` must succeed
5. **Keep it focused** — one logical change per PR

## Project Structure

```
src/
  data/           Tax brackets, credits, deductions, state data
  calculators/    Core calculation engines (federal, state, EITC)
  tools/          MCP tool definitions (one file per category)
  index.ts        Server entry point
```

## Updating Tax Data

When IRS publishes new data, follow `docs/ANNUAL_UPDATE_CHECKLIST.md` for the step-by-step process.
