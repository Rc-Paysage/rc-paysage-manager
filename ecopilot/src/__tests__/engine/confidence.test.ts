import { describe, expect, it } from "vitest";
import { calculateConfidenceScore } from "../../engine/confidence";

describe("calculateConfidenceScore", () => {
  it("returns a low score for a brand new, uncalibrated vehicle", () => {
    const score = calculateConfidenceScore({ calibrationDistanceKm: 0, calibrationSampleCount: 0 });
    expect(score).toBe(0);
  });

  it("increases monotonically with more calibration distance", () => {
    const low = calculateConfidenceScore({ calibrationDistanceKm: 100, calibrationSampleCount: 1 });
    const high = calculateConfidenceScore({ calibrationDistanceKm: 2000, calibrationSampleCount: 1 });
    expect(high).toBeGreaterThan(low);
  });

  it("increases monotonically with more comparable trips", () => {
    const vehicle = { calibrationDistanceKm: 500, calibrationSampleCount: 5 };
    const fewer = calculateConfidenceScore(vehicle, { comparableTripCount: 1 });
    const more = calculateConfidenceScore(vehicle, { comparableTripCount: 10 });
    expect(more).toBeGreaterThan(fewer);
  });

  it("decreases as recent prediction errors grow larger", () => {
    const vehicle = { calibrationDistanceKm: 500, calibrationSampleCount: 5 };
    const stable = calculateConfidenceScore(vehicle, { recentPredictionErrors: [0.01, -0.02, 0.01] });
    const unstable = calculateConfidenceScore(vehicle, { recentPredictionErrors: [0.4, -0.5, 0.3] });
    expect(stable).toBeGreaterThan(unstable);
  });

  it("never exceeds 1 or goes below 0", () => {
    const score = calculateConfidenceScore(
      { calibrationDistanceKm: 1_000_000, calibrationSampleCount: 1_000_000 },
      { comparableTripCount: 1_000_000, recentPredictionErrors: [0, 0, 0] }
    );
    expect(score).toBeLessThanOrEqual(1);
    expect(score).toBeGreaterThanOrEqual(0);
  });
});
