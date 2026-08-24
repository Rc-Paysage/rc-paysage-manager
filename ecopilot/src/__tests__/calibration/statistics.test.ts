import { describe, expect, it } from "vitest";
import {
  median,
  arithmeticMean,
  medianAbsoluteDeviation,
  calculateRobustConsumption,
  detectCalibrationOutliers,
} from "../../engine/calibration/statistics";

describe("median", () => {
  it("returns the middle value for an odd count", () => {
    expect(median([5, 1, 3])).toBe(3);
  });
  it("averages the two middle values for an even count", () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });
});

describe("medianAbsoluteDeviation", () => {
  it("is zero when all values are identical", () => {
    expect(medianAbsoluteDeviation([5, 5, 5])).toBe(0);
  });
  it("computes the median of absolute deviations from the median", () => {
    // médiane([4,5,6,9]) = 5.5 ; déviations = [1.5, 0.5, 0.5, 3.5] -> médiane des déviations = 1
    expect(medianAbsoluteDeviation([4, 5, 6, 9])).toBe(1);
  });
});

describe("calculateRobustConsumption", () => {
  it("uses the median below the trimmed-mean threshold", () => {
    const values = [5.3, 5.4, 5.5, 5.4, 8.9]; // 5 valeurs, < seuil par défaut (10)
    const result = calculateRobustConsumption(values);
    expect(result.method).toBe("MEDIAN");
    expect(result.value).toBe(median(values));
  });

  it("switches to a trimmed mean once enough observations exist", () => {
    const values = [5.0, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 9.9]; // 10 valeurs
    const result = calculateRobustConsumption(values);
    expect(result.method).toBe("TRIMMED_MEAN");
    // La moyenne tronquée (10%) doit être nettement plus proche du centre que la moyenne brute.
    expect(result.value).toBeLessThan(arithmeticMean(values));
  });

  it("falls back to the median if trimming would remove everything", () => {
    const values = [5, 6];
    const result = calculateRobustConsumption(values, { minObservationsForTrimmedMean: 1, trimFraction: 0.5 });
    expect(result.method).toBe("MEDIAN");
    expect(result.value).toBe(median(values));
  });
});

describe("detectCalibrationOutliers (Test C — valeur aberrante)", () => {
  it("does not attempt detection below the minimum sample size", () => {
    const candidates = [
      { id: "a", value: 5.3 },
      { id: "b", value: 5.4 },
      { id: "c", value: 8.9 },
    ];
    const result = detectCalibrationOutliers(candidates);
    expect(result.method).toBe("INSUFFICIENT_DATA");
    expect(result.outlierIds).toEqual([]);
  });

  it("flags a clearly aberrant value once enough observations exist", () => {
    const candidates = [
      { id: "a", value: 5.3 },
      { id: "b", value: 5.4 },
      { id: "c", value: 5.5 },
      { id: "d", value: 5.4 },
      { id: "e", value: 8.9 },
    ];
    const result = detectCalibrationOutliers(candidates);
    expect(result.method).toBe("MODIFIED_Z_SCORE_MAD");
    expect(result.outlierIds).toEqual(["e"]);
  });

  it("does not flag anything when all values are identical (zero dispersion)", () => {
    const candidates = Array.from({ length: 6 }, (_, i) => ({ id: `o${i}`, value: 5.5 }));
    const result = detectCalibrationOutliers(candidates);
    expect(result.method).toBe("NO_DISPERSION");
    expect(result.outlierIds).toEqual([]);
  });

  it("never flags the median observation itself", () => {
    const candidates = [
      { id: "a", value: 5.3 },
      { id: "b", value: 5.4 },
      { id: "c", value: 5.5 },
      { id: "d", value: 5.4 },
      { id: "e", value: 8.9 },
    ];
    const result = detectCalibrationOutliers(candidates);
    expect(result.outlierIds).not.toContain("c");
  });
});
