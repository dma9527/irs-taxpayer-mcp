"""Compare every row of the official IRS Tax Table with the engine's Tax Table method.

Needs network access, pypdf, and `npm run build`:
  .venv-taxcalc/bin/python scripts/sources/check_tax_table.py [URL]
The default URL is the current Form 1040 Tax Table (i1040tt.pdf); its tax year is read from the PDF.
"""
import json
import logging
import re
import subprocess
import sys
import warnings

warnings.filterwarnings("ignore")
logging.disable(logging.CRITICAL)
from pypdf import PdfReader

URL = sys.argv[1] if len(sys.argv) > 1 else "https://www.irs.gov/pub/irs-pdf/i1040tt.pdf"
PATH = "/tmp/irs-tax-table.pdf"
STATUSES = ["single", "married_filing_jointly", "married_filing_separately", "head_of_household"]

subprocess.run(["curl", "-sSL", "-A", "Mozilla/5.0", "--max-time", "120", "-o", PATH, URL], check=True)
reader = PdfReader(PATH, strict=False)
text = " ".join(page.extract_text() or "" for page in reader.pages)
year_match = re.search(r"(20\d\d) Tax Table", text)
if not year_match:
    sys.exit("Could not find the tax year in the Tax Table PDF")
year = int(year_match.group(1))

ROW = re.compile(r"^(\d[\d,]*) (\d[\d,]*) (\d[\d,]*) (\d[\d,]*) (\d[\d,]*) (\d[\d,]*)$")
rows = {}
for page in reader.pages:
    for line in (page.extract_text() or "").splitlines():
        match = ROW.match(line.strip())
        if not match:
            continue
        low, high, *values = (int(group.replace(",", "")) for group in match.groups())
        width = {0: 5, 5: 10, 15: 10}.get(low, 25 if low < 3000 else 50)
        if high - low == width and high <= 100000:
            rows.setdefault(low, values)

script = """
import { calculateRegularTax } from "./dist/calculators/tax-calculator.js";
import { getTaxYearData } from "./dist/data/tax-brackets.js";
const { year, lows, statuses } = JSON.parse(process.argv[1]);
const data = getTaxYearData(year);
if (!data) { console.error(`TY${year} is not supported`); process.exit(2); }
console.log(JSON.stringify(lows.map((low) => statuses.map((status) => calculateRegularTax(low, data.brackets[status], "irs_form")))));
"""
lows = sorted(rows)
engine = json.loads(subprocess.check_output(
    ["node", "--input-type=module", "-e", script, json.dumps({"year": year, "lows": lows, "statuses": STATUSES})],
    text=True,
))
mismatches = [(low, rows[low], values) for low, values in zip(lows, engine) if rows[low] != values]
# Rows: $0-5, $5-15, $15-25, $25 rows to $3,000, $50 rows to $100,000.
expected_rows = 3 + (3000 - 25) // 25 + (100000 - 3000) // 50
print(f"TY{year} Tax Table: {len(lows)} rows parsed (expected {expected_rows}), {len(mismatches)} mismatches")
for low, official, values in mismatches[:20]:
    print(f"  row {low}: official {official} engine {values}")
sys.exit(1 if mismatches or len(lows) != expected_rows else 0)
