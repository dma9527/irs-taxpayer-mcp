/**
 * IRS key dates and deadlines by tax year.
 */

export interface TaxDeadline {
  date: string;
  description: string;
  form?: string;
  notes?: string;
}

export const TAX_DEADLINES: Record<number, TaxDeadline[]> = {
  2024: [
    { date: "2025-01-15", description: "Q4 2024 estimated tax payment due", form: "1040-ES" },
    { date: "2025-01-31", description: "Employers must send W-2 forms to employees" },
    { date: "2025-01-31", description: "Payers must send 1099 forms to recipients" },
    { date: "2025-04-15", description: "Individual tax return filing deadline", form: "1040" },
    { date: "2025-04-15", description: "Q1 2025 estimated tax payment due", form: "1040-ES" },
    { date: "2025-06-16", description: "Q2 2025 estimated tax payment due", form: "1040-ES" },
    { date: "2025-09-15", description: "Q3 2025 estimated tax payment due", form: "1040-ES" },
    { date: "2025-10-15", description: "Extended filing deadline (if extension filed)", form: "1040", notes: "Must file Form 4868 by April 15" },
  ],
  2025: [
    { date: "2026-01-15", description: "Q4 2025 estimated tax payment due", form: "1040-ES" },
    { date: "2026-01-31", description: "Employers must send W-2 forms to employees" },
    { date: "2026-01-31", description: "Payers must send 1099 forms to recipients" },
    { date: "2026-04-15", description: "Individual tax return filing deadline", form: "1040" },
    { date: "2026-04-15", description: "Q1 2026 estimated tax payment due", form: "1040-ES" },
    { date: "2026-06-15", description: "Q2 2026 estimated tax payment due", form: "1040-ES" },
    { date: "2026-09-15", description: "Q3 2026 estimated tax payment due", form: "1040-ES" },
    { date: "2026-10-15", description: "Extended filing deadline (if extension filed)", form: "1040", notes: "Must file Form 4868 by April 15" },
  ],
};
