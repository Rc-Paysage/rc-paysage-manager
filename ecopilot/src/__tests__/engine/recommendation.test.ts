import { describe, expect, it } from "vitest";
import { evaluateScenario } from "../../engine/evaluateScenario";
import { selectRecommendedScenario } from "../../engine/recommendation";
import { resolveMinSpeedKmh } from "../../engine/speedConstraints";
import { DEFAULT_USER_PREFERENCES } from "../../types";
import { anchorTestTrip, NO_FLOOR_SPEED_CONSTRAINTS, petrolVehicle, singleHighwaySegmentTrip } from "../fixtures";

describe("selectRecommendedScenario", () => {
  it("respects the user's time tolerance constraint (anchored durations)", () => {
    const trip = singleHighwaySegmentTrip();
    const fast = evaluateScenario(trip, petrolVehicle, { type: "FAST", segmentTargetSpeedsKmh: [130] });
    const preferences = { ...DEFAULT_USER_PREFERENCES, timeToleranceMin: 5 };

    const recommended = selectRecommendedScenario(trip, petrolVehicle, preferences, fast);

    expect(recommended.anchoredDurationMin).toBeLessThanOrEqual(
      fast.anchoredDurationMin + preferences.timeToleranceMin + 1e-6
    );
  });

  it("minimizes cost among scenarios within the time tolerance", () => {
    const trip = singleHighwaySegmentTrip();
    const fast = evaluateScenario(trip, petrolVehicle, { type: "FAST", segmentTargetSpeedsKmh: [130] });
    const preferences = { ...DEFAULT_USER_PREFERENCES, timeToleranceMin: 15 };

    const recommended = selectRecommendedScenario(trip, petrolVehicle, preferences, fast);

    // Un scénario plus lent, encore dans la tolérance, ne doit jamais coûter moins cher
    // que la recommandation (sinon ce ne serait pas la vraie minimisation de coût).
    expect(recommended.costEuros).toBeLessThanOrEqual(fast.costEuros);
  });

  it("with zero tolerance, falls back to the FAST scenario's cost", () => {
    const trip = singleHighwaySegmentTrip();
    const fast = evaluateScenario(trip, petrolVehicle, { type: "FAST", segmentTargetSpeedsKmh: [130] });
    const preferences = { ...DEFAULT_USER_PREFERENCES, timeToleranceMin: 0 };

    const recommended = selectRecommendedScenario(trip, petrolVehicle, preferences, fast);

    expect(recommended.anchoredDurationMin).toBeCloseTo(fast.anchoredDurationMin, 5);
    expect(recommended.costEuros).toBeCloseTo(fast.costEuros, 5);
  });

  it("a wider tolerance never yields a higher recommended cost than a narrower one", () => {
    const trip = singleHighwaySegmentTrip();
    const fast = evaluateScenario(trip, petrolVehicle, { type: "FAST", segmentTargetSpeedsKmh: [130] });

    const narrow = selectRecommendedScenario(
      trip,
      petrolVehicle,
      { ...DEFAULT_USER_PREFERENCES, timeToleranceMin: 2 },
      fast
    );
    const wide = selectRecommendedScenario(
      trip,
      petrolVehicle,
      { ...DEFAULT_USER_PREFERENCES, timeToleranceMin: 20 },
      fast
    );

    expect(wide.costEuros).toBeLessThanOrEqual(narrow.costEuros);
  });

  it("never recommends a speed below the safety floor, even with an enormous time tolerance", () => {
    const trip = singleHighwaySegmentTrip();
    const fast = evaluateScenario(trip, petrolVehicle, { type: "FAST", segmentTargetSpeedsKmh: [130] });
    const preferences = { ...DEFAULT_USER_PREFERENCES, timeToleranceMin: 1000 };

    const recommended = selectRecommendedScenario(trip, petrolVehicle, preferences, fast);

    const segment = trip.segments[0];
    const minSafeSpeed = resolveMinSpeedKmh(segment.roadType, segment.speedLimitKmh);
    recommended.scenario.segmentTargetSpeedsKmh.forEach((speed) => {
      expect(speed).toBeGreaterThanOrEqual(minSafeSpeed);
    });
  });

  describe("test 4 — the tolerance constraint is evaluated on anchoredDurationMin, not theoreticalDurationMin", () => {
    it("anchors FAST on the GPS reference and bounds the recommendation by anchored minutes", () => {
      // FAST théorique 60 min, GPS 90 min -> délai fixe +30 min appliqué à tout le trajet.
      const trip = anchorTestTrip(90);
      const fast = evaluateScenario(
        trip,
        petrolVehicle,
        { type: "FAST", segmentTargetSpeedsKmh: [100] },
        { speedConstraints: NO_FLOOR_SPEED_CONSTRAINTS }
      );
      expect(fast.anchoredDurationMin).toBeCloseTo(90, 5);

      const preferences = { ...DEFAULT_USER_PREFERENCES, timeToleranceMin: 15 };
      const recommended = selectRecommendedScenario(trip, petrolVehicle, preferences, fast, {
        speedConstraints: NO_FLOOR_SPEED_CONSTRAINTS,
      });

      // La contrainte "+15 min" doit porter sur des minutes réalistes (ancrées sur le GPS),
      // pas sur le modèle théorique seul.
      expect(recommended.anchoredDurationMin).toBeLessThanOrEqual(fast.anchoredDurationMin + 15 + 1e-6);
      expect(recommended.timeAnchorStatus).toBe("APPLIED");
    });

    it("reports a diverging anchoredDurationMin vs theoreticalDurationMin when a GPS delay applies", () => {
      const trip = anchorTestTrip(90);
      const fast = evaluateScenario(
        trip,
        petrolVehicle,
        { type: "FAST", segmentTargetSpeedsKmh: [100] },
        { speedConstraints: NO_FLOOR_SPEED_CONSTRAINTS }
      );
      const preferences = { ...DEFAULT_USER_PREFERENCES, timeToleranceMin: 15 };
      const recommended = selectRecommendedScenario(trip, petrolVehicle, preferences, fast, {
        speedConstraints: NO_FLOOR_SPEED_CONSTRAINTS,
      });

      expect(recommended.anchoredDurationMin).not.toBeCloseTo(recommended.theoreticalDurationMin, 5);
      expect(recommended.anchoredDurationMin - recommended.theoreticalDurationMin).toBeCloseTo(30, 5);
    });
  });
});
