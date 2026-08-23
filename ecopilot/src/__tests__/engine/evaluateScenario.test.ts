import { describe, expect, it } from "vitest";
import { evaluateScenario } from "../../engine/evaluateScenario";
import { petrolVehicle, singleHighwaySegmentTrip } from "../fixtures";

describe("evaluateScenario", () => {
  it("computes duration, fuel and cost consistently for a single segment", () => {
    const trip = singleHighwaySegmentTrip();
    const result = evaluateScenario(trip, petrolVehicle, {
      type: "FAST",
      segmentTargetSpeedsKmh: [130],
    });

    // 100 km à 130 km/h -> ~46.15 min
    expect(result.durationMin).toBeCloseTo((100 / 130) * 60, 5);
    // Courbe: 7.4 L/100km à 130 km/h -> 7.4 L sur 100 km
    expect(result.fuelLiters).toBeCloseTo(7.4, 5);
    expect(result.costEuros).toBeCloseTo(7.4 * petrolVehicle.fuelPricePerLiter, 5);
    expect(result.co2Grams).toBeCloseTo(7.4 * petrolVehicle.co2GramsPerLiterFuel, 5);
    expect(result.electricEnergyKwh).toBe(0);
  });

  it("computes extraTimeMin and savingsEuros relative to a baseline", () => {
    const trip = singleHighwaySegmentTrip();
    const fast = evaluateScenario(trip, petrolVehicle, { type: "FAST", segmentTargetSpeedsKmh: [130] });
    const eco = evaluateScenario(
      trip,
      petrolVehicle,
      { type: "ECO", segmentTargetSpeedsKmh: [90] },
      { baseline: fast }
    );

    expect(eco.durationMin).toBeGreaterThan(fast.durationMin);
    expect(eco.extraTimeMin).toBeCloseTo(eco.durationMin - fast.durationMin, 5);
    expect(eco.fuelLiters).toBeLessThan(fast.fuelLiters);
    expect(eco.savingsEuros).toBeGreaterThan(0);
    expect(eco.co2AvoidedGrams).toBeGreaterThan(0);
  });

  it("never applies a target speed above the segment's legal speed limit", () => {
    const trip = singleHighwaySegmentTrip();
    const result = evaluateScenario(trip, petrolVehicle, {
      type: "FAST",
      segmentTargetSpeedsKmh: [200], // volontairement au-dessus de la limite (130)
    });
    // A 200 km/h la conso interpolée serait bornée au point 130 (7.4 L/100km) de toute façon,
    // donc on vérifie plutôt le temps : borné à la vitesse légale, jamais plus rapide que 130 km/h.
    expect(result.durationMin).toBeCloseTo((100 / 130) * 60, 5);
  });

  it("throws if the scenario does not provide one target speed per segment", () => {
    const trip = singleHighwaySegmentTrip();
    expect(() =>
      evaluateScenario(trip, petrolVehicle, { type: "FAST", segmentTargetSpeedsKmh: [] })
    ).toThrow();
  });
});
