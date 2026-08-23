import { describe, expect, it } from "vitest";
import { calculateTimeAnchor, anchorScenarioDuration } from "../../engine/timeAnchor";

describe("calculateTimeAnchor", () => {
  it("test 1 — computes the fixed additive delay when the GPS reference is above theoretical FAST", () => {
    // FAST théorique 60 min, GPS 90 min -> délai fixe 30 min (additif, pas multiplicatif : 90/60=1.5
    // ne doit jamais être utilisé comme facteur).
    const result = calculateTimeAnchor(60, 90);
    expect(result).toEqual({ fixedDelayMin: 30, status: "APPLIED" });
  });

  it("test 2 — no reference (zero) yields no delay and NO_REFERENCE", () => {
    expect(calculateTimeAnchor(60, 0)).toEqual({ fixedDelayMin: 0, status: "NO_REFERENCE" });
  });

  it("test 2bis — a negative reference also yields NO_REFERENCE", () => {
    expect(calculateTimeAnchor(60, -5)).toEqual({ fixedDelayMin: 0, status: "NO_REFERENCE" });
  });

  it("test 3 — reference below theoretical FAST yields no negative delay and REFERENCE_BELOW_THEORETICAL", () => {
    expect(calculateTimeAnchor(60, 45)).toEqual({ fixedDelayMin: 0, status: "REFERENCE_BELOW_THEORETICAL" });
  });

  it("treats an exactly equal reference as APPLIED with a zero delay (not a negative-delay edge case)", () => {
    expect(calculateTimeAnchor(60, 60)).toEqual({ fixedDelayMin: 0, status: "APPLIED" });
  });

  it("never returns a negative fixedDelayMin", () => {
    const cases = [
      calculateTimeAnchor(60, 90),
      calculateTimeAnchor(60, 0),
      calculateTimeAnchor(60, 45),
      calculateTimeAnchor(60, 60),
    ];
    cases.forEach((result) => expect(result.fixedDelayMin).toBeGreaterThanOrEqual(0));
  });
});

describe("anchorScenarioDuration", () => {
  it("adds the fixed delay to the theoretical duration", () => {
    expect(anchorScenarioDuration(75, 30)).toBe(105);
  });

  it("is a no-op when the delay is zero", () => {
    expect(anchorScenarioDuration(66.67, 0)).toBe(66.67);
  });

  it("applies the SAME delay uniformly regardless of the scenario's own theoretical duration", () => {
    // C'est la propriété clé du modèle additif : le délai ne dépend pas du scénario évalué.
    const delay = 30;
    expect(anchorScenarioDuration(60, delay) - anchorScenarioDuration(60, delay)).toBe(0);
    expect(anchorScenarioDuration(75, delay) - anchorScenarioDuration(60, delay)).toBe(75 - 60);
  });
});
