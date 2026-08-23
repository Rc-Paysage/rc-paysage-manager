import { describe, expect, it } from "vitest";
import { interpolateConsumption } from "../../engine/consumptionCurve";
import type { ConsumptionCurvePoint } from "../../types";

const curve: ConsumptionCurvePoint[] = [
  { speedKmh: 50, litersPer100km: 5, electricKwhPer100km: 8, source: "ESTIMATED_UNCALIBRATED" },
  { speedKmh: 100, litersPer100km: 7, electricKwhPer100km: 6, source: "ESTIMATED_UNCALIBRATED" },
];

describe("interpolateConsumption", () => {
  it("returns the exact point value at a known speed", () => {
    const result = interpolateConsumption(curve, 50);
    expect(result.litersPer100km).toBe(5);
  });

  it("interpolates linearly at the midpoint", () => {
    const result = interpolateConsumption(curve, 75);
    expect(result.litersPer100km).toBeCloseTo(6, 5);
    expect(result.electricKwhPer100km).toBeCloseTo(7, 5);
  });

  it("clamps to the lowest point below the curve range", () => {
    const result = interpolateConsumption(curve, 10);
    expect(result.litersPer100km).toBe(5);
  });

  it("clamps to the highest point above the curve range", () => {
    const result = interpolateConsumption(curve, 200);
    expect(result.litersPer100km).toBe(7);
  });

  it("marks the result CALIBRATED only when both surrounding points are calibrated", () => {
    const mixed: ConsumptionCurvePoint[] = [
      { speedKmh: 50, litersPer100km: 5, electricKwhPer100km: 8, source: "CALIBRATED" },
      { speedKmh: 100, litersPer100km: 7, electricKwhPer100km: 6, source: "ESTIMATED_UNCALIBRATED" },
    ];
    expect(interpolateConsumption(mixed, 75).source).toBe("ESTIMATED_UNCALIBRATED");

    const bothCalibrated: ConsumptionCurvePoint[] = [
      { speedKmh: 50, litersPer100km: 5, electricKwhPer100km: 8, source: "CALIBRATED" },
      { speedKmh: 100, litersPer100km: 7, electricKwhPer100km: 6, source: "CALIBRATED" },
    ];
    expect(interpolateConsumption(bothCalibrated, 75).source).toBe("CALIBRATED");
  });
});
