import { describe, expect, it } from "vitest";
import { LAW_CHANGES, getLawChangesEffectiveBetween } from "./law-changes.js";

describe("law change registry", () => {
  it("cites an https primary source for every entry", () => {
    for (const change of LAW_CHANGES) {
      expect(change.sources.length, change.id).toBeGreaterThan(0);
      for (const source of change.sources) {
        expect(source.url, change.id).toMatch(/^https:\/\/(www\.)?(govinfo\.gov|irs\.gov|ssa\.gov|mass\.gov|tax\.illinois\.gov|ncdor\.gov|pa\.gov|ftb\.ca\.gov)\//);
      }
    }
  });

  it("uses unique ids", () => {
    const ids = LAW_CHANGES.map((change) => change.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("returns only changes effective after fromYear through toYear", () => {
    const changes = getLawChangesEffectiveBetween(2025, 2026);
    expect(changes.length).toBeGreaterThan(0);
    expect(changes.every((change) => change.effectiveTaxYear === 2026)).toBe(true);
  });
});
