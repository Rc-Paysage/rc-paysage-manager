import { describe, expect, it } from "vitest";
import { calculateCalibrationReadiness, DEFAULT_CALIBRATION_READINESS_THRESHOLDS } from "../../engine/calibration/readiness";

describe("calculateCalibrationReadiness", () => {
  it("test A — a single observation never reaches CANDIDATE or CALIBRATED", () => {
    const readiness = calculateCalibrationReadiness({
      observationCount: 1,
      totalDistanceKm: 120,
      dispersionRatio: 0,
      excludedRatio: 0,
    });
    expect(readiness).not.toBe("CANDIDATE");
    expect(readiness).not.toBe("CALIBRATED");
  });

  it("returns INSUFFICIENT_DATA below the collecting threshold", () => {
    expect(
      calculateCalibrationReadiness({ observationCount: 1, totalDistanceKm: 50, dispersionRatio: 0, excludedRatio: 0 })
    ).toBe("INSUFFICIENT_DATA");
  });

  it("returns COLLECTING with enough observations but not enough distance", () => {
    expect(
      calculateCalibrationReadiness({ observationCount: 6, totalDistanceKm: 50, dispersionRatio: 0.05, excludedRatio: 0 })
    ).toBe("COLLECTING");
  });

  it("test G — high dispersion keeps a group at COLLECTING even with many observations/km", () => {
    const readiness = calculateCalibrationReadiness({
      observationCount: 20,
      totalDistanceKm: 2000,
      dispersionRatio: 0.5, // très dispersé
      excludedRatio: 0,
    });
    expect(readiness).toBe("COLLECTING");
    expect(readiness).not.toBe("CALIBRATED");
  });

  it("returns CANDIDATE once volume/distance/dispersion criteria are met but not yet the stricter CALIBRATED ones", () => {
    const readiness = calculateCalibrationReadiness({
      observationCount: 5,
      totalDistanceKm: 300,
      dispersionRatio: 0.1,
      excludedRatio: 0,
    });
    expect(readiness).toBe("CANDIDATE");
  });

  it("returns CALIBRATED only when all criteria (volume, distance, dispersion, exclusion) are met", () => {
    const readiness = calculateCalibrationReadiness({
      observationCount: 10,
      totalDistanceKm: 800,
      dispersionRatio: 0.05,
      excludedRatio: 0.1,
    });
    expect(readiness).toBe("CALIBRATED");
  });

  it("a high excluded ratio caps readiness at CANDIDATE even with good volume/dispersion", () => {
    const readiness = calculateCalibrationReadiness({
      observationCount: 10,
      totalDistanceKm: 800,
      dispersionRatio: 0.05,
      excludedRatio: 0.5, // beaucoup d'aberrations écartées : signal de qualité douteuse
    });
    expect(readiness).toBe("CANDIDATE");
  });

  it("test H — stability: more coherent observations and more km progress readiness upward", () => {
    const small = calculateCalibrationReadiness({
      observationCount: 3,
      totalDistanceKm: 100,
      dispersionRatio: 0.05,
      excludedRatio: 0,
    });
    const medium = calculateCalibrationReadiness({
      observationCount: 6,
      totalDistanceKm: 400,
      dispersionRatio: 0.05,
      excludedRatio: 0,
    });
    const large = calculateCalibrationReadiness({
      observationCount: 12,
      totalDistanceKm: 900,
      dispersionRatio: 0.05,
      excludedRatio: 0,
    });

    const order: Record<string, number> = { INSUFFICIENT_DATA: 0, COLLECTING: 1, CANDIDATE: 2, CALIBRATED: 3 };
    expect(order[small]).toBeLessThan(order[medium]);
    expect(order[medium]).toBeLessThan(order[large]);
  });

  it("exposes centralized, documented, configurable thresholds (not hidden in business logic)", () => {
    expect(DEFAULT_CALIBRATION_READINESS_THRESHOLDS.minObservationsForCandidate).toBeGreaterThan(1);
    const customThresholds = { ...DEFAULT_CALIBRATION_READINESS_THRESHOLDS, minObservationsForCandidate: 2 };
    const readiness = calculateCalibrationReadiness(
      { observationCount: 2, totalDistanceKm: 300, dispersionRatio: 0.05, excludedRatio: 0 },
      customThresholds
    );
    expect(readiness).toBe("CANDIDATE");
  });
});
