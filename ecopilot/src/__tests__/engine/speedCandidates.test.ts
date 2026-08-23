import { describe, expect, it } from "vitest";
import {
  buildGlobalSpeedFactorCandidates,
  CURRENT_SPEED_OPTIMIZATION_STRATEGY,
} from "../../engine/speedCandidates";
import { singleHighwaySegmentTrip } from "../fixtures";

describe("§2 audit — GLOBAL_SPEED_FACTOR strategy made explicit", () => {
  it("documents the current strategy as GLOBAL_SPEED_FACTOR, not PER_SEGMENT_OPTIMIZATION", () => {
    expect(CURRENT_SPEED_OPTIMIZATION_STRATEGY).toBe("GLOBAL_SPEED_FACTOR");
  });

  it("applies the SAME factor to every segment of a trip", () => {
    const trip = singleHighwaySegmentTrip();
    trip.segments.push({ id: "seg-2", distanceKm: 20, roadType: "MAIN_ROAD", speedLimitKmh: 90 });

    const [firstCandidate] = buildGlobalSpeedFactorCandidates(trip);
    // Avant clamp de sécurité, le même facteur (ici 1.0, le premier candidat) est appliqué aux
    // deux segments : c'est précisément la limite documentée de GLOBAL_SPEED_FACTOR.
    expect(firstCandidate.segmentTargetSpeedsKmh[0]).toBe(trip.segments[0].speedLimitKmh * firstCandidate.factor);
    expect(firstCandidate.segmentTargetSpeedsKmh[1]).toBe(trip.segments[1].speedLimitKmh * firstCandidate.factor);
  });
});
