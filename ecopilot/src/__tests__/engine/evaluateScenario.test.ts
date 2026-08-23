import { describe, expect, it } from "vitest";
import { evaluateScenario } from "../../engine/evaluateScenario";
import { capturETech145 } from "../../data/vehicles/captur-e-tech-145";
import {
  anchorTestTrip,
  NO_FLOOR_SPEED_CONSTRAINTS,
  petrolVehicle,
  pluginHybridVehicle,
  singleHighwaySegmentTrip,
} from "../fixtures";

describe("evaluateScenario", () => {
  it("computes duration, fuel and cost consistently for a single segment", () => {
    const trip = singleHighwaySegmentTrip();
    const result = evaluateScenario(trip, petrolVehicle, {
      type: "FAST",
      segmentTargetSpeedsKmh: [130],
    });

    // 100 km à 130 km/h -> ~46.15 min
    expect(result.theoreticalDurationMin).toBeCloseTo((100 / 130) * 60, 5);
    // Courbe: 7.4 L/100km à 130 km/h -> 7.4 L sur 100 km
    expect(result.fuelLiters).toBeCloseTo(7.4, 5);
    expect(result.costEuros).toBeCloseTo(7.4 * petrolVehicle.fuelPricePerLiter, 5);
    expect(result.co2Grams).toBeCloseTo(7.4 * petrolVehicle.co2GramsPerLiterFuel, 5);
    expect(result.electricEnergyKwh).toBe(0);
  });

  it("computes extraTimeMin from anchored durations, and savingsEuros relative to a baseline", () => {
    const trip = singleHighwaySegmentTrip();
    const fast = evaluateScenario(trip, petrolVehicle, { type: "FAST", segmentTargetSpeedsKmh: [130] });
    const eco = evaluateScenario(
      trip,
      petrolVehicle,
      { type: "ECO", segmentTargetSpeedsKmh: [90] },
      { baseline: fast }
    );

    expect(eco.theoreticalDurationMin).toBeGreaterThan(fast.theoreticalDurationMin);
    expect(eco.extraTimeMin).toBeCloseTo(eco.anchoredDurationMin - fast.anchoredDurationMin, 5);
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
    expect(result.theoreticalDurationMin).toBeCloseTo((100 / 130) * 60, 5);
  });

  it("never applies a target speed below the road type's operational safety floor", () => {
    const trip = singleHighwaySegmentTrip();
    const result = evaluateScenario(trip, petrolVehicle, {
      type: "ECO",
      segmentTargetSpeedsKmh: [5], // volontairement très en dessous du plancher autoroute
    });
    // A 90 km/h (plancher par défaut autoroute) le trajet dure au plus (100/90)*60 minutes.
    expect(result.theoreticalDurationMin).toBeLessThanOrEqual((100 / 90) * 60 + 1e-6);
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

  describe("time anchor — additive model (§ correctif modèle temporel)", () => {
    it("test 1 — GPS reference above theoretical FAST: anchors FAST and ECO with the same fixed delay", () => {
      // Exemple du cahier des charges : FAST théorique 60 min, GPS 90 min, ECO théorique 75 min
      // -> délai fixe 30 min, FAST ancré 90, ECO ancré 105, extraTimeMin ECO = 15 min (pas 22.5).
      const trip = anchorTestTrip(90);

      const fast = evaluateScenario(
        trip,
        petrolVehicle,
        { type: "FAST", segmentTargetSpeedsKmh: [100] }, // 100 km à 100 km/h -> 60 min théorique
        { speedConstraints: NO_FLOOR_SPEED_CONSTRAINTS }
      );
      expect(fast.theoreticalDurationMin).toBeCloseTo(60, 5);
      expect(fast.timeAnchorStatus).toBe("APPLIED");
      expect(fast.anchoredDurationMin).toBeCloseTo(90, 5);
      expect(fast.extraTimeMin).toBe(0);

      const eco = evaluateScenario(
        trip,
        petrolVehicle,
        { type: "ECO", segmentTargetSpeedsKmh: [80] }, // 100 km à 80 km/h -> 75 min théorique
        { speedConstraints: NO_FLOOR_SPEED_CONSTRAINTS, baseline: fast }
      );
      expect(eco.theoreticalDurationMin).toBeCloseTo(75, 5);
      expect(eco.timeAnchorStatus).toBe("APPLIED");
      expect(eco.anchoredDurationMin).toBeCloseTo(105, 5);
      expect(eco.extraTimeMin).toBeCloseTo(15, 5);
    });

    it("test 2 — no GPS reference: anchoredDurationMin falls back to theoreticalDurationMin, status NO_REFERENCE", () => {
      const trip = anchorTestTrip(0);
      const fast = evaluateScenario(
        trip,
        petrolVehicle,
        { type: "FAST", segmentTargetSpeedsKmh: [100] },
        { speedConstraints: NO_FLOOR_SPEED_CONSTRAINTS }
      );
      expect(fast.timeAnchorStatus).toBe("NO_REFERENCE");
      expect(fast.anchoredDurationMin).toBe(fast.theoreticalDurationMin);
    });

    it("test 3 — GPS reference below theoretical FAST: no negative delay, status REFERENCE_BELOW_THEORETICAL", () => {
      const trip = anchorTestTrip(10); // largement en dessous des 60 min théoriques
      const fast = evaluateScenario(
        trip,
        petrolVehicle,
        { type: "FAST", segmentTargetSpeedsKmh: [100] },
        { speedConstraints: NO_FLOOR_SPEED_CONSTRAINTS }
      );
      expect(fast.timeAnchorStatus).toBe("REFERENCE_BELOW_THEORETICAL");
      expect(fast.anchoredDurationMin).toBe(fast.theoreticalDurationMin);
      expect(fast.anchoredDurationMin).toBeGreaterThanOrEqual(fast.theoreticalDurationMin); // pas de délai négatif
    });

    it("test 5 — FAST always has extraTimeMin = 0, anchored or not", () => {
      for (const referenceDurationMin of [90, 0, 10]) {
        const trip = anchorTestTrip(referenceDurationMin);
        const fast = evaluateScenario(
          trip,
          petrolVehicle,
          { type: "FAST", segmentTargetSpeedsKmh: [100] },
          { speedConstraints: NO_FLOOR_SPEED_CONSTRAINTS }
        );
        expect(fast.extraTimeMin).toBe(0);
      }
    });

    it("exposes theoreticalDurationMin and anchoredDurationMin as distinct fields, with no ambiguous durationMin", () => {
      const trip = singleHighwaySegmentTrip();
      const result = evaluateScenario(trip, petrolVehicle, { type: "FAST", segmentTargetSpeedsKmh: [130] });
      expect("durationMin" in result).toBe(false);
      expect(typeof result.theoreticalDurationMin).toBe("number");
      expect(typeof result.anchoredDurationMin).toBe("number");
      expect(typeof result.timeAnchorStatus).toBe("string");
    });
  });

  describe("hybrid energy accounting (§3 audit initial / §1 audit correctif)", () => {
    it("excludes electric kWh from cost and CO2 for a non-rechargeable full hybrid", () => {
      const trip = singleHighwaySegmentTrip();
      const result = evaluateScenario(trip, capturETech145, { type: "FAST", segmentTargetSpeedsKmh: [130] });

      expect(result.electricEnergyKwh).toBeGreaterThan(0);
      expect(result.costEuros).toBeCloseTo(result.fuelLiters * capturETech145.fuelPricePerLiter, 5);
      expect(result.co2Grams).toBeCloseTo(result.fuelLiters * capturETech145.co2GramsPerLiterFuel, 5);
    });

    it("computes fuelLiters for the full hybrid over the segment's entire distance", () => {
      const trip = singleHighwaySegmentTrip();
      const result = evaluateScenario(trip, capturETech145, { type: "FAST", segmentTargetSpeedsKmh: [130] });
      // Courbe Captur à 130 km/h : 7.4 L/100km, sur 100 km entiers -> 7.4 L, quel que soit
      // electricDistanceKm (§1 audit correctif).
      expect(result.fuelLiters).toBeCloseTo(7.4, 5);
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
