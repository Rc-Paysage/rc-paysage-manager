import { describe, expect, it } from "vitest";
import { estimateConsumption } from "../../engine/estimateConsumption";
import { capturETech145 } from "../../data/vehicles/captur-e-tech-145";
import { petrolVehicle } from "../fixtures";
import type { RouteSegment } from "../../types";

const urbanSegment: RouteSegment = {
  id: "seg-urban",
  distanceKm: 10,
  roadType: "URBAN",
  speedLimitKmh: 50,
  targetSpeedKmh: 50,
  estimatedAverageSpeedKmh: 50,
};

describe("estimateConsumption", () => {
  it("uses only fuel (no electric) for a petrol vehicle", () => {
    const result = estimateConsumption(urbanSegment, petrolVehicle);
    expect(result.electricEnergyKwh).toBe(0);
    expect(result.electricDistanceKm).toBe(0);
    expect(result.fuelLiters).toBeGreaterThan(0);
  });

  it("splits distance between fuel and electric for a full hybrid vehicle", () => {
    const result = estimateConsumption(urbanSegment, capturETech145);
    expect(result.electricDistanceKm).toBeGreaterThan(0);
    expect(result.electricDistanceKm).toBeLessThan(urbanSegment.distanceKm);
    expect(result.fuelLiters).toBeGreaterThan(0);
    expect(result.electricEnergyKwh).toBeGreaterThan(0);
    expect(result.energyRecoveredKwh).toBeGreaterThan(0);
    expect(result.energyRecoveredKwh).toBeLessThan(result.electricEnergyKwh);
  });

  it("flags hybrid results as uncalibrated by default", () => {
    const result = estimateConsumption(urbanSegment, capturETech145);
    expect(result.isUncalibrated).toBe(true);
  });

  it("throws for a non-positive average speed", () => {
    const stalled: RouteSegment = { ...urbanSegment, estimatedAverageSpeedKmh: 0 };
    expect(() => estimateConsumption(stalled, petrolVehicle)).toThrow();
  });
});
