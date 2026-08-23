import { describe, expect, it } from "vitest";
import { generateScenarios } from "../../engine/generateScenarios";
import { resolveMinSpeedKmh } from "../../engine/speedConstraints";
import { petrolVehicle, mixedRoadTrip } from "../fixtures";

describe("generateScenarios", () => {
  it("never proposes a target speed above any segment's legal speed limit", () => {
    const trip = mixedRoadTrip();
    const { fast, balanced, eco } = generateScenarios(trip, petrolVehicle);

    for (const result of [fast, balanced, eco]) {
      result.scenario.segmentTargetSpeedsKmh.forEach((speed, index) => {
        expect(speed).toBeLessThanOrEqual(trip.segments[index].speedLimitKmh);
      });
    }
  });

  it("ECO never costs more than FAST", () => {
    const trip = mixedRoadTrip();
    const { fast, eco } = generateScenarios(trip, petrolVehicle);
    expect(eco.costEuros).toBeLessThanOrEqual(fast.costEuros);
  });

  it("BALANCED sits between FAST and ECO in duration and cost", () => {
    const trip = mixedRoadTrip();
    const { fast, balanced, eco } = generateScenarios(trip, petrolVehicle);

    expect(balanced.theoreticalDurationMin).toBeGreaterThanOrEqual(fast.theoreticalDurationMin);
    expect(balanced.theoreticalDurationMin).toBeLessThanOrEqual(eco.theoreticalDurationMin);
    expect(balanced.costEuros).toBeLessThanOrEqual(fast.costEuros);
    expect(balanced.costEuros).toBeGreaterThanOrEqual(eco.costEuros);
  });

  it("FAST uses the legal speed limit on every segment", () => {
    const trip = mixedRoadTrip();
    const { fast } = generateScenarios(trip, petrolVehicle);
    fast.scenario.segmentTargetSpeedsKmh.forEach((speed, index) => {
      expect(speed).toBe(trip.segments[index].speedLimitKmh);
    });
  });

  it("ECO never proposes a speed below the road type's safety floor", () => {
    const trip = mixedRoadTrip();
    const { eco } = generateScenarios(trip, petrolVehicle);
    eco.scenario.segmentTargetSpeedsKmh.forEach((speed, index) => {
      const segment = trip.segments[index];
      expect(speed).toBeGreaterThanOrEqual(resolveMinSpeedKmh(segment.roadType, segment.speedLimitKmh));
    });
  });
});
