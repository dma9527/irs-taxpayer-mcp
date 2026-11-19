/**
 * Required minimum distribution rules for IRA owners.
 *
 * Sources:
 *   Uniform Lifetime Table: Treas. Reg. 1.401(a)(9)-9(c), Table 2 (https://www.ecfr.gov/current/title-26/section-1.401(a)(9)-9)
 *   Applicable age: IRC 401(a)(9)(C)(v) as amended by SECURE 2.0 Act sec. 107 (P.L. 117-328)
 */

const UNIFORM_LIFETIME_TABLE: Readonly<Record<number, number>> = {
  72: 27.4, 73: 26.5, 74: 25.5, 75: 24.6, 76: 23.7, 77: 22.9, 78: 22.0, 79: 21.1,
  80: 20.2, 81: 19.4, 82: 18.5, 83: 17.7, 84: 16.8, 85: 16.0, 86: 15.2, 87: 14.4,
  88: 13.7, 89: 12.9, 90: 12.2, 91: 11.5, 92: 10.8, 93: 10.1, 94: 9.5, 95: 8.9,
  96: 8.4, 97: 7.8, 98: 7.3, 99: 6.8, 100: 6.4, 101: 6.0, 102: 5.6, 103: 5.2,
  104: 4.9, 105: 4.6, 106: 4.3, 107: 4.1, 108: 3.9, 109: 3.7, 110: 3.5, 111: 3.4,
  112: 3.3, 113: 3.1, 114: 3.0, 115: 2.9, 116: 2.8, 117: 2.7, 118: 2.5, 119: 2.3,
};
const UNIFORM_LIFETIME_MINIMUM_AGE = 72;
const UNIFORM_LIFETIME_FINAL_DIVISOR = 2.0;

/** Uniform Lifetime Table divisor for the owner's age at the birthday in the distribution year. */
export function getUniformLifetimeDivisor(age: number): number | undefined {
  if (!Number.isInteger(age) || age < UNIFORM_LIFETIME_MINIMUM_AGE) return undefined;
  return UNIFORM_LIFETIME_TABLE[age] ?? UNIFORM_LIFETIME_FINAL_DIVISOR;
}

/** Age at which RMDs start: 72 for 1950 or earlier births, 73 for 1951 to 1959, 75 for 1960 or later. */
export function getRmdApplicableAge(birthYear: number): number {
  if (birthYear <= 1950) return 72;
  if (birthYear <= 1959) return 73;
  return 75;
}
