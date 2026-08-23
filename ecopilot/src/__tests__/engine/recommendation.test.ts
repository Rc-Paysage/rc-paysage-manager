import { describe, expect, it } from "vitest";
import { evaluateScenario } from "../../engine/evaluateScenario";
import { selectRecommendedScenario } from "../../engine/recommendation";
import { DEFAULT_USER_PREFERENCES } from "../../types";
import { petrolVehicle, singleHighwaySegmentTrip } from "../fixtures";

describe("selectRecommendedScenario", () => {
  it("respects the user's time tolerance constraint", () => {
    const trip = singleHighwaySegmentTrip();
    const fast = evaluateScenario(trip, petrolVehicle, { type: "FAST", segmentTargetSpeedsKmh: [130] });
    const preferences = { ...DEFAULT_USER_PREFERENCES, timeToleranceMin: 5 };

    const recommended = selectRecommendedScenario(trip, petrolVehicle, preferences, fast);

    expect(recommended.durationMin).toBeLessThanOrEqual(fast.durationMin + preferences.timeToleranceMin + 1e-6);
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

    expect(recommended.durationMin).toBeCloseTo(fast.durationMin, 5);
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
});
