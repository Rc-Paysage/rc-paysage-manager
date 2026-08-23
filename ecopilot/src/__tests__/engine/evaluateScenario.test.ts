import { describe, expect, it } from "vitest";
import { evaluateScenario } from "../../engine/evaluateScenario";
import { capturETech145 } from "../../data/vehicles/captur-e-tech-145";
import { petrolVehicle, pluginHybridVehicle, singleHighwaySegmentTrip } from "../fixtures";

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
    expect(result.durationMin).toBeCloseTo((100 / 130) * 60, 5);
  });

  it("never applies a target speed below the road type's reasonable safety floor", () => {
    const trip = singleHighwaySegmentTrip();
    const result = evaluateScenario(trip, petrolVehicle, {
      type: "ECO",
      segmentTargetSpeedsKmh: [5], // volontairement très en dessous du plancher autoroute
    });
    // A 90 km/h (plancher par défaut autoroute) le trajet dure au plus (100/90)*60 minutes.
    expect(result.durationMin).toBeLessThanOrEqual((100 / 90) * 60 + 1e-6);
  });

  it("throws if the scenario does not provide one target speed per segment", () => {
    const trip = singleHighwaySegmentTrip();
    expect(() =>
      evaluateScenario(trip, petrolVehicle, { type: "FAST", segmentTargetSpeedsKmh: [] })
    ).toThrow();
  });

  it("defaults to a PROVISIONAL uncertainty range without prediction error history", () => {
    const trip = singleHighwaySegmentTrip();
    const result = evaluateScenario(trip, petrolVehicle, { type: "FAST", segmentTargetSpeedsKmh: [130] });
    expect(result.uncertaintyRange.status).toBe("PROVISIONAL");
  });

  it("computes a CALCULATED uncertainty range once enough calibration data is passed in", () => {
    const trip = singleHighwaySegmentTrip();
    const result = evaluateScenario(
      trip,
      petrolVehicle,
      { type: "FAST", segmentTargetSpeedsKmh: [130] },
      { calibration: { recentPredictionErrors: [-0.1, -0.05, 0, 0.05, 0.1] } }
    );
    expect(result.uncertaintyRange.status).toBe("CALCULATED");
  });

  describe("hybrid energy accounting (§3 audit)", () => {
    it("excludes electric kWh from cost and CO2 for a non-rechargeable full hybrid", () => {
      const trip = singleHighwaySegmentTrip();
      const result = evaluateScenario(trip, capturETech145, { type: "FAST", segmentTargetSpeedsKmh: [130] });

      expect(result.electricEnergyKwh).toBeGreaterThan(0);
      expect(result.costEuros).toBeCloseTo(result.fuelLiters * capturETech145.fuelPricePerLiter, 5);
      expect(result.co2Grams).toBeCloseTo(result.fuelLiters * capturETech145.co2GramsPerLiterFuel, 5);
    });

    it("includes electric kWh in cost and CO2 for a plugin hybrid", () => {
      const trip = singleHighwaySegmentTrip();
      const result = evaluateScenario(trip, pluginHybridVehicle, {
        type: "FAST",
        segmentTargetSpeedsKmh: [130],
      });

      expect(result.electricEnergyKwh).toBeGreaterThan(0);
      const expectedCost =
        result.fuelLiters * pluginHybridVehicle.fuelPricePerLiter +
        result.electricEnergyKwh * pluginHybridVehicle.electricityPricePerKwh;
      expect(result.costEuros).toBeCloseTo(expectedCost, 5);
    });
  });
});
