/**
 * Input validation utilities for tax calculators.
 * Catches unreasonable inputs before they produce misleading results.
 */

export interface ValidationError {
  field: string;
  message: string;
}

export function validateIncome(value: number, field: string): ValidationError | null {
  if (value < 0) return { field, message: `${field} cannot be negative` };
  if (value > 100_000_000) return { field, message: `${field} exceeds $100M — please verify` };
  if (!Number.isFinite(value)) return { field, message: `${field} must be a finite number` };
  return null;
}

export function validateTaxYear(year: number): ValidationError | null {
  if (!Number.isInteger(year)) return { field: "taxYear", message: "Tax year must be an integer" };
  if (year < 2024 || year > 2025) return { field: "taxYear", message: `Tax year ${year} not supported. Use 2024 or 2025` };
  return null;
}

export function validateAge(age: number): ValidationError | null {
  if (!Number.isInteger(age)) return { field: "age", message: "Age must be an integer" };
  if (age < 0 || age > 120) return { field: "age", message: "Age must be between 0 and 120" };
  return null;
}

export function validateRate(rate: number, field: string): ValidationError | null {
  if (rate < 0 || rate > 1) return { field, message: `${field} must be between 0 and 1 (e.g., 0.065 for 6.5%)` };
  return null;
}

export function validateStateCode(code: string): ValidationError | null {
  if (code.length !== 2) return { field: "stateCode", message: "State code must be exactly 2 characters" };
  if (!/^[A-Za-z]{2}$/.test(code)) return { field: "stateCode", message: "State code must be letters only" };
  return null;
}

/**
 * Run multiple validations and return all errors.
 */
export function validate(...checks: Array<ValidationError | null>): ValidationError[] {
  return checks.filter((c): c is ValidationError => c !== null);
}

/**
 * Format validation errors for MCP tool response.
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  if (errors.length === 0) return "";
  const lines = [
    "## ❌ Input Validation Errors",
    "",
    ...errors.map((e) => `- **${e.field}**: ${e.message}`),
    "",
    "Please correct the inputs and try again.",
  ];
  return lines.join("\n");
}
