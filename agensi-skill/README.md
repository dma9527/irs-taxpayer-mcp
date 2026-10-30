# Packaging this skill for Agensi

This folder is not published to npm (not listed in `package.json`'s `files`). It is the source for the Agensi
marketplace listing only.

## Steps

1. Create an Agensi account at agensi.io, then turn on Creator Mode in Dashboard, then Settings.
2. Free listing needs no payout setup. Skip Stripe Connect / Zoneless unless you decide to charge.
3. Zip the skill:

   ```bash
   cd agensi-skill
   zip -r ../irs-tax-calculator-skill.zip SKILL.md reference
   ```

4. Go to agensi.io/dashboard/submit and upload `irs-tax-calculator-skill.zip`.
5. Copy the fields from `LISTING.md` into the form (name, summary, description, example, compatibility note,
   pricing, categories, tags, limitations/FAQ, docs link).
6. Before submitting, re-run the example in `LISTING.md` against the current build to confirm the output
   still matches (the `[VERIFY ...]` note). Quick way to regenerate it:

   ```bash
   npm run build
   node -e '
     const { spawn } = require("child_process");
     const p = spawn("node", ["dist/index.js"]);
     let buf = "";
     p.stdout.on("data", d => buf += d);
     const send = m => p.stdin.write(JSON.stringify(m) + "\n");
     send({jsonrpc:"2.0",id:1,method:"initialize",params:{protocolVersion:"2024-11-05",capabilities:{},clientInfo:{name:"t",version:"1"}}});
     setTimeout(() => {
       send({jsonrpc:"2.0",method:"notifications/initialized"});
       send({jsonrpc:"2.0",id:2,method:"tools/call",params:{name:"calculate_federal_tax",arguments:{grossIncome:150000,filingStatus:"married_filing_jointly",taxYear:2025,dependents:2}}});
     }, 300);
     setTimeout(() => { console.log(buf); p.kill(); }, 1500);
   '
   ```

7. Submit. Expect a security scan plus human review, typically within a few hours to 48 hours.
8. Optional: reply to Joeri Brons at Agensi to mention the listing is live; he reached out proactively so he
   may be able to flag it for a faster or featured review.

## If anything changes in the MCP server

Keep this skill in sync manually: if a tool is renamed, added, or removed in `src/tools/`, update
`SKILL.md` and `reference/tool-catalog.md` in the same change, then re-zip and push a listing update through
Agensi's "new ZIP goes through review as an update" flow (the current version keeps serving buyers while it's
reviewed).
