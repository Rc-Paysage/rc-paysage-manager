import { describe, expect, it } from "vitest";
import { groupComparableObservations } from "../../engine/calibration/grouping";
import { median } from "../../engine/calibration/statistics";
import { capturGlobalBaselineObservation } from "../../data/calibration/capturGlobalBaseline";
import { makeObservation } from "./fixtures";

describe("groupComparableObservations", () => {
  it("test A — a single observation never produces a CALIBRATED (or even CANDIDATE) group", () => {
    const { groups } = groupComparableObservations([makeObservation()]);
    expect(groups).toHaveLength(1);
    expect(groups[0].observationCount).toBe(1);
    expect(groups[0].readiness).not.toBe("CANDIDATE");
    expect(groups[0].readiness).not.toBe("CALIBRATED");
  });

  it("test B — several comparable observations around 110 km/h form one group, robust value near the true center", () => {
    const values = [5.3, 5.4, 5.5, 5.4, 5.5, 5.3];
    const observations = values.map((v) => makeObservation({ observedFuelConsumptionLPer100km: v, distanceKm: 100 }));

    const { groups } = groupComparableObservations(observations);
    expect(groups).toHaveLength(1);
    const group = groups[0];
    expect(group.context).toBe("MOTORWAY");
    expect(group.speedBucket.id).toBe("110");
    expect(group.observationCount).toBe(values.length);
    expect(group.robustConsumptionLPer100km).toBeCloseTo(median(values), 1);
    expect(group.totalDistanceKm).toBe(600);
  });

  it("test C — an aberrant value is kept in the data but can be excluded from calibration", () => {
    const values = [5.3, 5.4, 5.5, 5.4, 8.9];
    const observations = values.map((v) => makeObservation({ observedFuelConsumptionLPer100km: v }));
    const aberrantId = observations[4].id;

    const { groups } = groupComparableObservations(observations);
    expect(groups).toHaveLength(1);
    const group = groups[0];

    // La donnée reste comptée dans le pool initial (traçable) mais exclue du calcul robuste.
    expect(group.excludedObservationIds).toContain(aberrantId);
    expect(group.includedObservationIds).not.toContain(aberrantId);
    expect(group.excludedObservationReasons[aberrantId]).toBe("STATISTICAL_OUTLIER_MAD");
    // Le robuste doit rester proche du cœur du groupe, pas tiré vers 8.9.
    expect(group.robustConsumptionLPer100km).toBeLessThan(6);
  });

  it("test D — a MIXED trip is reported as skipped, never silently merged into a MOTORWAY 110 group", () => {
    const homogeneous = [5.3, 5.4, 5.5, 5.4, 5.5].map((v) =>
      makeObservation({ observedFuelConsumptionLPer100km: v })
    );
    const mixedTrip = makeObservation({
      routeHomogeneity: "MIXED",
      observedFuelConsumptionLPer100km: 6.8,
      targetSpeedKmh: 110,
      roadContext: "MOTORWAY",
    });

    const { groups, skipped } = groupComparableObservations([...homogeneous, mixedTrip]);

    expect(groups).toHaveLength(1);
    expect(groups[0].observationCount).toBe(5);
    expect(groups[0].includedObservationIds).not.toContain(mixedTrip.id);
    expect(skipped).toContainEqual({ observationId: mixedTrip.id, reason: "MIXED_ROUTE" });
  });

  it("test E — the Captur global baseline never creates a speed/consumption point", () => {
    const { groups, skipped } = groupComparableObservations([capturGlobalBaselineObservation]);
    expect(groups).toHaveLength(0);
    expect(skipped).toContainEqual({
      observationId: capturGlobalBaselineObservation.id,
      reason: "GLOBAL_BASELINE",
    });
  });

  it("test F — electricDistanceKm is never subtracted from distance in the group's totals/consumption", () => {
    const withoutElectric = makeObservation({ distanceKm: 100, observedFuelConsumptionLPer100km: 5.4, electricDistanceKm: undefined });
    const withElectric = makeObservation({ distanceKm: 100, observedFuelConsumptionLPer100km: 5.4, electricDistanceKm: 40 });

    const { groups: groupsWithout } = groupComparableObservations([withoutElectric]);
    const { groups: groupsWith } = groupComparableObservations([withElectric]);

    // Même distanceKm, même consommation déclarée -> mêmes totaux, qu'il y ait ou non des km
    // électriques renseignés : le Calibration Engine ne les retranche jamais (§13, §1 audit).
    expect(groupsWith[0].totalDistanceKm).toBe(groupsWithout[0].totalDistanceKm);
    expect(groupsWith[0].robustConsumptionLPer100km).toBe(groupsWithout[0].robustConsumptionLPer100km);
  });

  it("test G — many very dispersed observations do not become CALIBRATED just by crossing a count threshold", () => {
    const dispersedValues = [4.0, 7.5, 5.0, 8.5, 4.5, 9.0, 5.5, 8.0, 4.2, 9.2, 5.8, 7.8];
    const observations = dispersedValues.map((v, i) =>
      makeObservation({ observedFuelConsumptionLPer100km: v, distanceKm: 200, timestamp: `2026-01-${i + 1}` })
    );

    const { groups } = groupComparableObservations(observations);
    expect(groups).toHaveLength(1);
    expect(groups[0].observationCount).toBeGreaterThanOrEqual(10);
    expect(groups[0].readiness).not.toBe("CALIBRATED");
  });

  it("keeps distinct groups per (context, speedBucket) — comparable observations only within the same bucket", () => {
    const at110 = makeObservation({ targetSpeedKmh: 110, roadContext: "MOTORWAY" });
    const at130 = makeObservation({ targetSpeedKmh: 130, roadContext: "MOTORWAY" });

    const { groups } = groupComparableObservations([at110, at130]);
    expect(groups).toHaveLength(2);
    expect(new Set(groups.map((g) => g.speedBucket.id))).toEqual(new Set(["110", "130"]));
  });
});
