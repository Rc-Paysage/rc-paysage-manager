import { describe, expect, it } from "vitest";
import { buildSimpleTrip, buildWazeUrl } from "../../lib/simpleTrip";

describe("buildSimpleTrip", () => {
  it("builds a single highway segment for a MOTORWAY trip", () => {
    const trip = buildSimpleTrip({ distanceKm: 120, kind: "MOTORWAY" });
    expect(trip.segments).toHaveLength(1);
    expect(trip.segments[0].roadType).toBe("HIGHWAY");
    expect(trip.segments[0].distanceKm).toBe(120);
  });

  it("splits a MIXED trip across urban, road and highway segments that sum to the distance", () => {
    const trip = buildSimpleTrip({ distanceKm: 100, kind: "MIXED" });
    expect(trip.segments.map((s) => s.roadType)).toEqual(["URBAN", "MAIN_ROAD", "HIGHWAY"]);
    const total = trip.segments.reduce((sum, s) => sum + s.distanceKm, 0);
    expect(total).toBeCloseTo(100, 5);
  });

  it("uses the GPS duration as referenceDurationMin when provided, 0 otherwise (no invented GPS time)", () => {
    expect(buildSimpleTrip({ distanceKm: 100, kind: "MOTORWAY", gpsDurationMin: 75 }).referenceDurationMin).toBe(75);
    expect(buildSimpleTrip({ distanceKm: 100, kind: "MOTORWAY" }).referenceDurationMin).toBe(0);
    expect(buildSimpleTrip({ distanceKm: 100, kind: "MOTORWAY", gpsDurationMin: 0 }).referenceDurationMin).toBe(0);
  });

  it("falls back to a neutral destination label when none is given", () => {
    expect(buildSimpleTrip({ distanceKm: 10, kind: "URBAN", destination: "  " }).destination).toBe("Arrivée");
  });
});

describe("buildWazeUrl", () => {
  it("builds a Waze universal link with the destination encoded and navigation enabled", () => {
    expect(buildWazeUrl("Lyon Part-Dieu")).toBe("https://waze.com/ul?q=Lyon%20Part-Dieu&navigate=yes");
  });
});
