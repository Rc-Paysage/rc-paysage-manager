import type { CalibrationObservation } from "../../types";

let counter = 0;
function nextId(): string {
  counter += 1;
  return `obs-${counter}`;
}

/** Observation autoroutière homogène par défaut, personnalisable via overrides. */
export function makeObservation(overrides: Partial<CalibrationObservation> = {}): CalibrationObservation {
  return {
    id: nextId(),
    vehicleId: "captur-e-tech-145-2024",
    timestamp: "2026-01-01T00:00:00.000Z",
    distanceKm: 120,
    durationMin: 65,
    averageSpeedKmh: 110,
    observedFuelConsumptionLPer100km: 5.4,
    roadContext: "MOTORWAY",
    targetSpeedKmh: 110,
    routeHomogeneity: "HOMOGENEOUS",
    observationScope: "CANDIDATE",
    ...overrides,
  };
}
