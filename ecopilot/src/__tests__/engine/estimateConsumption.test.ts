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

  describe("full hybrid fuel model (§1 audit correctif)", () => {
    it("computes fuelLiters over the segment's FULL distance, not distance minus electricDistanceKm", () => {
      const result = estimateConsumption(urbanSegment, 50, capturETech145);
      // La courbe à 50 km/h vaut 4.6 L/100km pour le Captur : sur 10 km entiers -> 0.46 L.
      // Si electricDistanceKm était retranchée (ancien bug), fuelLiters serait strictement plus bas.
      expect(result.fuelLiters).toBeCloseTo((urbanSegment.distanceKm * 4.6) / 100, 5);
    });

    it("still reports electricDistanceKm/electricEnergyKwh as analytical metrics, without reducing fuelLiters", () => {
      const result = estimateConsumption(urbanSegment, 50, capturETech145);
      expect(result.electricDistanceKm).toBeGreaterThan(0);
      expect(result.electricDistanceKm).toBeLessThan(urbanSegment.distanceKm);
      expect(result.electricEnergyKwh).toBeGreaterThan(0);
      // fuelLiters ne doit PAS correspondre à (distance - electricDistanceKm) * conso/100.
      const wrongFuelLiters = ((urbanSegment.distanceKm - result.electricDistanceKm) * 4.6) / 100;
      expect(result.fuelLiters).not.toBeCloseTo(wrongFuelLiters, 5);
    });

    it("does not predict energyRecoveredKwh from a fixed ratio — the field no longer exists on the result", () => {
      const result = estimateConsumption(urbanSegment, 50, capturETech145);
      expect("energyRecoveredKwh" in result).toBe(false);
    });
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
    // courbe par défaut. À vitesse égale, le litre/km est donc identique en ville et sur
    // autoroute — seule la répartition électrique (analytique) par roadType diffère.
    const highwaySegment: RouteSegment = { id: "seg-hw", distanceKm: 10, roadType: "HIGHWAY", speedLimitKmh: 130 };
    const urbanResult = estimateConsumption(urbanSegment, 50, capturETech145);
    const highwayResult = estimateConsumption(highwaySegment, 50, capturETech145);

    expect(urbanResult.fuelLiters / urbanSegment.distanceKm).toBeCloseTo(
      highwayResult.fuelLiters / highwaySegment.distanceKm,
      5
    );
  });
});
