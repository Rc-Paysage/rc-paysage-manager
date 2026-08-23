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
};

describe("estimateConsumption", () => {
  it("uses only fuel (no electric) for a petrol vehicle", () => {
    const result = estimateConsumption(urbanSegment, 50, petrolVehicle);
    expect(result.electricEnergyKwh).toBe(0);
    expect(result.electricDistanceKm).toBe(0);
    expect(result.fuelLiters).toBeGreaterThan(0);
  });

  it("splits distance between fuel and electric for a full hybrid vehicle", () => {
    const result = estimateConsumption(urbanSegment, 50, capturETech145);
    expect(result.electricDistanceKm).toBeGreaterThan(0);
    expect(result.electricDistanceKm).toBeLessThan(urbanSegment.distanceKm);
    expect(result.fuelLiters).toBeGreaterThan(0);
    expect(result.electricEnergyKwh).toBeGreaterThan(0);
    expect(result.energyRecoveredKwh).toBeGreaterThan(0);
    expect(result.energyRecoveredKwh).toBeLessThan(result.electricEnergyKwh);
  });

  it("flags hybrid results as uncalibrated by default", () => {
    const result = estimateConsumption(urbanSegment, 50, capturETech145);
    expect(result.isUncalibrated).toBe(true);
  });

  it("takes the target speed as given (no legal/safety clamp — that's the caller's job)", () => {
    const result = estimateConsumption(urbanSegment, 45, petrolVehicle);
    expect(result.estimatedAverageSpeedKmh).toBe(45);
    expect(result.durationMin).toBeCloseTo((urbanSegment.distanceKm / 45) * 60, 5);
  });

  it("throws for a non-positive target speed", () => {
    expect(() => estimateConsumption(urbanSegment, 0, petrolVehicle)).toThrow();
    expect(() => estimateConsumption(urbanSegment, -10, petrolVehicle)).toThrow();
  });

  it("falls back to defaultConsumptionCurve when no context-specific profile exists", () => {
    // capturETech145 n'a pas de consumptionProfiles : tous les contextes retombent sur la même
    // courbe par défaut. À vitesse égale, le litre/km sur la part carburant est donc identique
    // en ville et sur autoroute — seule la répartition électrique par roadType diffère.
    const highwaySegment: RouteSegment = { id: "seg-hw", distanceKm: 10, roadType: "HIGHWAY", speedLimitKmh: 130 };
    const urbanResult = estimateConsumption(urbanSegment, 50, capturETech145);
    const highwayResult = estimateConsumption(highwaySegment, 50, capturETech145);

    const urbanFuelDistanceKm = urbanSegment.distanceKm - urbanResult.electricDistanceKm;
    const highwayFuelDistanceKm = highwaySegment.distanceKm - highwayResult.electricDistanceKm;

    expect(urbanResult.fuelLiters / urbanFuelDistanceKm).toBeCloseTo(
      highwayResult.fuelLiters / highwayFuelDistanceKm,
      5
    );
  });
});
