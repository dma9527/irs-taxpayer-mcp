import { describe, expect, it } from "vitest";
import { getRmdApplicableAge, getUniformLifetimeDivisor } from "./rmd.js";

describe("Uniform Lifetime Table", () => {
  it.each([
    [72, 27.4],
    [73, 26.5],
    [75, 24.6],
    [80, 20.2],
    [85, 16.0],
    [90, 12.2],
    [100, 6.4],
    [119, 2.3],
    [120, 2.0],
    [125, 2.0],
  ])("age %i uses divisor %f", (age, divisor) => {
    expect(getUniformLifetimeDivisor(age)).toBe(divisor);
  });

  it("has no divisor before age 72", () => {
    expect(getUniformLifetimeDivisor(71)).toBeUndefined();
  });
});

describe("RMD applicable age", () => {
  it.each([
    [1950, 72],
    [1951, 73],
    [1959, 73],
    [1960, 75],
    [1966, 75],
  ])("born %i starts at %i", (birthYear, age) => {
    expect(getRmdApplicableAge(birthYear)).toBe(age);
  });
});
