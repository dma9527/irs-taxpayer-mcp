"""Re-read each official state source and confirm every TY2026 constant appears in it.

Needs network access and pypdf: python3 scripts/sources/check_state_sources.py
"""
import html
import logging
import os
import re
import subprocess
import warnings

warnings.filterwarnings("ignore")
logging.disable(logging.CRITICAL)
from pypdf import PdfReader

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"


def fetch(url, path):
    subprocess.run(["curl", "-sSL", "-A", UA, "--max-time", "90", "-o", path, url], check=True)
    with open(path, "rb") as handle:
        head = handle.read(5)
    if head.startswith(b"%PDF"):
        reader = PdfReader(path, strict=False)
        if reader.is_encrypted:
            reader.decrypt("")
        text = " ".join(page.extract_text() or "" for page in reader.pages)
    else:
        raw = open(path, errors="ignore").read()
        raw = re.sub(r"<script.*?</script>|<style.*?</style>", " ", raw, flags=re.S | re.I)
        text = html.unescape(re.sub(r"<[^>]+>", " ", raw))
    return re.sub(r"\s+", " ", text).replace(" ,", ",")


SOURCES = {
    "MS": ("https://www.dor.ms.gov/individual/tax-rates",
           ["$12,000", "$ 6,000", "$ 4,600", "$ 2,300", "Tax Year 2026 Excess of $10,000 of Taxable Income is taxed @ 4%"]),
    "RI": ("https://tax.ri.gov/sites/g/files/xkgbur541/files/2025-11/ADV_2025_22_Inflation_Adjustments.pdf",
           ["$11,200", "$22,400", "$5,250", "$261,000", "82,050", "186,450", "3,076.88", "8,035.88", "5.99%"]),
    "NE": ("https://revenue.nebraska.gov/sites/default/files/doc/research/chronology/4-607table1.pdf",
           ["$176", "$8,850", "4,130", "24,760", "39,900", "8,250", "49,530", "79,800", "4.55%"]),
    "MN": ("https://www.revenue.state.mn.us/press-release/2025-12-16/minnesota-income-tax-brackets-standard-deduction-and-dependent-exemption",
           ["$33,310", "$109,430", "$203,150", "$48,700", "$193,480", "$337,930", "$30,600", "$15,300", "9.85%"]),
    "MN-statute": ("https://www.revisor.mn.gov/statutes/cite/290.0123", ["$220,650"]),
    "KS": ("https://ksrevenue.gov/pdf/k-40es26.pdf",
           ["Single $3,605", "Married Filing Joint $8,240", "$23,000", "$1,196 plus 5.58%", "$46,000", "$2,392 plus 5.58%"]),
    "KS-exemption": ("https://ksrevenue.gov/taxnotices/notice24-08.pdf", ["$18,320", "$9,160"]),
    "CA": ("https://www.ftb.ca.gov/about-ftb/newsroom/tax-news/2026/10.html",
           ["$5,900", "$11,800", "22,927", "54,316", "70,018", "86,654", "102,356", "522,385", "626,864", "1,044,771", "Single or married/RDP filing separately"]),
    "MA-statute": ("https://malegislature.gov/Laws/GeneralLaws/PartI/TitleIX/Chapter62/Section3", ["$4,400", "$6,800", "$8,800"]),
    "NC-statute": ("https://ncleg.gov/EnactedLegislation/Statutes/HTML/BySection/Chapter_105/GS_105-153.5.html", ["Head of Household 19,125", "Married, filing separately 12,750"]),
    "NE-1040N": ("https://revenue.nebraska.gov/sites/default/files/doc/tax-forms/drafts/f_1040n.pdf", ["$12,950 if head of household", "$8,850 if married, filing separately", "$17 6 times"]),
    "NE-HoH": ("https://revenue.nebraska.gov/sites/default/files/doc/tax-forms/drafts/2026_tax_calculation_schedule.pdf", ["7,700", "39,620", "59,160", "189.42", "1,309.81", "2,198.88"]),
    "MN-HoH": ("https://www.revenue.state.mn.us/press-release/2025-12-16/minnesota-income-tax-brackets-standard-deduction-and-dependent-exemption",
           ["up to $41,010", "$164,801 - $270,060", "up to $24,350", "$96,741 - $168,965", "Head of Household standard deduction - $23,000"]),
    "MN-MFS-limit": ("https://www.revisor.mn.gov/statutes/cite/290.0123", ["one-half of the adjusted gross income amounts"]),
    "KS-status": ("https://ksrevenue.gov/pdf/k-40es26.pdf", ["Married Filing Separate $4,120", "Head of Household $6,180", "SINGLE, HEAD OF HOUSEHOLD, OR MARRIED FILING SEPARATE"]),
    "MS-status": ("https://www.dor.ms.gov/individual/tax-rates", ["Head of Family $ 8,000", "Head of Family $ 3,400"]),
    "RI-status": ("https://tax.ri.gov/sites/g/files/xkgbur541/files/2025-11/ADV_2025_22_Inflation_Adjustments.pdf", ["Head of household $16,350 $16,800"]),
    "NJ-status": ("https://www.nj.gov/treasury/taxation/pdf/current/1040esi.pdf", ["Head of Household", "Table B"]),
    "ND-status": ("https://www.tax.nd.gov/sites/www/files/documents/forms/software-developer/individual-income-forms/28709-form-nd-1es-2026%20final.pdf",
           ["41,400", "152,425", "2,164.99", "66,400", "277,600", "4,118.40"]),
    "ND": ("https://www.tax.nd.gov/sites/www/files/documents/forms/software-developer/individual-income-forms/28709-form-nd-1es-2026%20final.pdf",
           ["49,575", "250,400", "3,916.09", "82,800", "304,850", "4,329.98", "1.95%", "2.50%"]),
    "CA-credit": ("https://www.ftb.ca.gov/about-ftb/newsroom/tax-news/2026/10.html",
                  ["Personal exemption credit amount for single, separate, and head of household taxpayers $153 $158", "joint filers or surviving spouses $306 $316"]),
    "CA-credit-limit": ("https://www.ftb.ca.gov/forms/2025/2025-540-booklet.html",
                        ["$252,203", "$504,411", "$378,310", "Divide line c by $2,500 ($1,250 if married/RDP filing separately)", "Multiply line d by $6"]),
    "WA": ("https://dor.wa.gov/taxes-rates/other-taxes/capital-gains-tax", ["The standard deduction for 2025 is $278,000"]),
    "WA-statute": ("https://app.leg.wa.gov/RCW/default.aspx?cite=82.87.150", ["the department must not adjust the applicable amounts"]),
    # Federally taxable Social Security subtracted or excluded (federalIncomeTreatment in src/data/state-taxes.ts).
    "CA-SS": ("https://www.ftb.ca.gov/file/personal/income-types/social-security.html", ["as a subtraction on California Adjustments"]),
    "CA-retirement": ("https://www.ftb.ca.gov/forms/2025/2025-1005-publication.pdf", ["generally the same as the federal treatment"]),
    "IL-SS": ("https://tax.illinois.gov/individuals/pension.html", ["Social Security", "Individual Retirement Accounts"]),
    "NC-SS": ("https://www.ncdor.gov/taxes-forms/individual-income-tax/filing-topics/social-security-and-railroad-retirement-benefits", ["social security"]),
    "MA-SS": ("https://budget.digital.mass.gov/govbudget/fy27/tax-expenditure-budget/personal-income-tax/exclusions-from-gross-income/1-009/", ["Social Security benefits are excluded from Massachusetts gross income"]),
    "MI-SS": ("https://www.michigan.gov/treasury/reference/taxpayer-notices/2025/11/17/social-security-taxation-changes-in-public-act-24-of-2025", ["deduct SSA income included in AGI"]),
    "IN-SS": ("https://forms.in.gov/Download.aspx?id=16353", ["Taxable Social Security benefits"]),
    "KY-SS": ("https://revenue.ky.gov/Forms/Schedule%20M%20(2025).pdf", ["taxable amount of Social Security"]),
    "GA-SS": ("https://www.audits2.ga.gov/wp-content/uploads/2023/11/Social-Security-Exclusion-Summary.pdf", ["fully exempts Social Security benefits"]),
    "OH-SS": ("https://dam.assets.ohio.gov/image/upload/v1767098956/tax.ohio.gov/forms/ohio_individual/individual/2025/scheduleofadjustments.pdf", ["Taxable Social Security benefits"]),
    "VA-SS": ("https://law.lis.virginia.gov/vacode/title58.1/chapter3/section58.1-322.02/", ["Benefits received under Title II of the Social Security Act"]),
    "NJ-SS": ("https://nj.gov/treasury/taxation/pdf/anchor/anchor-home-income.pdf", ["Social Security"]),
    "PA-retirement": ("https://pa.gov/content/dam/copapwp-pagov/en/revenue/documents/formsandpublications/formsforindividuals/pit/documents/2025/2025_pa-40in.pdf",
                      ["Commonly recognized pension, old age, or retirement benefits paid after becoming eligible to retire, and retiring"]),
    "KS-SS": ("https://www.ksrevenue.gov/taxnotices/notice24-08.pdf", ["removes the income limitation"]),
    "KS-retirement": ("https://ksrevenue.gov/pdf/schs25.pdf", ["Retirement benefits specifically exempt from Kansas income tax"]),
    "MS-SS-retirement": ("https://dor.ms.gov/sites/default/files/individual/Individual%20Income%20Checklist.pdf",
                         ["Federal Social Security Act benefits", "Retirement income – normal distributions", "Retirement income – early distributions"]),
    "NE-SS-retirement": ("https://revenue.nebraska.gov/sites/default/files/doc/tax-forms/2025/f_1040N_Schs.pdf",
                         ["Social Security included in Federal AGI", "Military retirement benefits"]),
    "NC-retirement": ("https://www.ncdor.gov/2025-d-401-individual-income-tax-instructions/open", ["Bailey Settlement"]),
    "OH-retirement": ("https://tax.ohio.gov/help-center/faqs/income-retirement-income",
                      ["Generally, retirement income included in federal adjusted gross income is subject to Ohio income tax"]),
    "VA-retirement": ("https://tax.virginia.gov/news/virginia-taxes-and-your-retirement", ["Traditional IRAs", "taxable to Virginia as well"]),
    "IN-retirement": ("https://www.in.gov/dor/files/ib26.pdf", ["Pensions (taxable portion)"]),
    "KY-retirement": ("https://revenue.ky.gov/Forms/Schedule%20P%20(2025).pdf", ["Enter the lesser of line 2 or $31,110", "IRA accounts, 401(k)"]),
    "PA-SS": ("https://pa.gov/content/dam/copapwp-pagov/en/revenue/documents/formsandpublications/formsforindividuals/pit/documents/2025/2025_pa-40in.pdf", ["INCOME NOT TAXABLE FOR PA PIT PURPOSES: • Social Security benefits"]),
}

os.makedirs("/tmp/src", exist_ok=True)
missing_total = 0
for code, (url, needles) in SOURCES.items():
    text = fetch(url, f"/tmp/src/check-{code}")
    missing = [needle for needle in needles if needle not in text and needle.replace(" ", "") not in text.replace(" ", "")]
    missing_total += len(missing)
    print(f"{code:13} {len(needles) - len(missing)}/{len(needles)} found" + (f"  MISSING: {missing}" if missing else ""))
print("all constants found" if missing_total == 0 else f"{missing_total} constants not found")
