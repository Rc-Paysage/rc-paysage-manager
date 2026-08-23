import { describe, expect, it } from "vitest";
import { calculateUncertaintyRange, MIN_SAMPLES_FOR_UNCERTAINTY_RANGE } from "../../engine/uncertainty";

describe("calculateUncertaintyRange", () => {
  it("is PROVISIONAL with no prediction error history", () => {
    const range = calculateUncertaintyRange(100);
    expect(range.status).toBe("PROVISIONAL");
  });

  it("stays PROVISIONAL below the minimum sample threshold", () => {
    const errors = Array(MIN_SAMPLES_FOR_UNCERTAINTY_RANGE - 1).fill(0.05);
    const range = calculateUncertaintyRange(100, { recentPredictionErrors: errors });
    expect(range.status).toBe("PROVISIONAL");
  });

  it("computes an empirical range from real observed errors once enough samples exist", () => {
    const errors = [-0.1, -0.05, 0, 0.05, 0.1];
    const range = calculateUncertaintyRange(100, { recentPredictionErrors: errors });
    expect(range.status).toBe("CALCULATED");
    if (range.status === "CALCULATED") {
      expect(range.lowEuros).toBeCloseTo(90, 5);
      expect(range.highEuros).toBeCloseTo(110, 5);
      expect(range.basisSampleCount).toBe(errors.length);
    }
  });

  it("never returns a negative low bound", () => {
    const errors = [-2, -1.5, -1.2, -0.9, -0.8];
    const range = calculateUncertaintyRange(100, { recentPredictionErrors: errors });
    expect(range.status).toBe("CALCULATED");
    if (range.status === "CALCULATED") {
      expect(range.lowEuros).toBeGreaterThanOrEqual(0);
    }
  });
});
