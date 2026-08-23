import type { Trip, VehicleProfile } from "../types";
import { DEFAULT_SPEED_CONSTRAINTS, type SpeedConstraintTable } from "../engine/speedConstraints";

/** Véhicule thermique simple, sans électrique, pour isoler les calculs de base des tests hybrides. */
export const petrolVehicle: VehicleProfile = {
  id: "test-petrol",
  brand: "Test",
  model: "Petrol",
  year: 2020,
  engine: "1.5 dCi",
  energyType: "PETROL",
  referenceFuelConsumptionPer100km: 6,
  defaultConsumptionCurve: [
    { speedKmh: 50, litersPer100km: 5, electricKwhPer100km: 0, source: "ESTIMATED_UNCALIBRATED" },
    { speedKmh: 90, litersPer100km: 5.5, electricKwhPer100km: 0, source: "ESTIMATED_UNCALIBRATED" },
    { speedKmh: 130, litersPer100km: 7.4, electricKwhPer100km: 0, source: "ESTIMATED_UNCALIBRATED" },
  ],
  calibrationDistanceKm: 0,
  calibrationSampleCount: 0,
  confidenceScore: 0,
  fuelPricePerLiter: 1.8,
  electricityPricePerKwh: 0.25,
  co2GramsPerLiterFuel: 2310,
  co2GramsPerKwhElectric: 60,
};

/** Véhicule hybride rechargeable, pour tester que son électricité EST une énergie externe. */
export const pluginHybridVehicle: VehicleProfile = {
  ...petrolVehicle,
  id: "test-plugin-hybrid",
  model: "Plugin Hybrid",
  energyType: "PLUGIN_HYBRID",
  batteryCapacityKwh: 10,
  defaultConsumptionCurve: [
    { speedKmh: 50, litersPer100km: 3, electricKwhPer100km: 15, source: "ESTIMATED_UNCALIBRATED" },
    { speedKmh: 90, litersPer100km: 4, electricKwhPer100km: 14, source: "ESTIMATED_UNCALIBRATED" },
    { speedKmh: 130, litersPer100km: 6, electricKwhPer100km: 14, source: "ESTIMATED_UNCALIBRATED" },
  ],
};

/** Un unique segment autoroutier de 100 km limité à 130 km/h. */
export function singleHighwaySegmentTrip(): Trip {
  return {
    id: "trip-1",
    origin: "A",
    destination: "B",
    distanceKm: 100,
    referenceDurationMin: 46,
    date: "2026-01-01",
    segments: [
      {
        id: "seg-1",
        distanceKm: 100,
        roadType: "HIGHWAY",
        speedLimitKmh: 130,
      },
    ],
  };
}

/**
 * Contraintes sans plancher, pour isoler les tests d'ancrage temporel de la logique de
 * sécurité/vitesse minimale (déjà couverte par speedConstraints.test.ts) : n'importe quelle
 * vitesse cible demandée est retrouvée telle quelle.
 */
export const NO_FLOOR_SPEED_CONSTRAINTS: SpeedConstraintTable = Object.fromEntries(
  Object.keys(DEFAULT_SPEED_CONSTRAINTS).map((roadType) => [
    roadType,
    { minReasonableSpeedKmh: 0, minSpeedFactorOfLimit: 0 },
  ])
) as SpeedConstraintTable;

/** Trajet à vitesse limite haute, pour choisir librement les vitesses cibles des tests d'ancrage temporel. */
export function anchorTestTrip(referenceDurationMin: number): Trip {
  return {
    id: "trip-anchor",
    origin: "A",
    destination: "B",
    distanceKm: 100,
    referenceDurationMin,
    date: "2026-01-01",
    segments: [{ id: "seg-1", distanceKm: 100, roadType: "HIGHWAY", speedLimitKmh: 150 }],
  };
}

/** Trajet mixte : un segment autoroute et un segment urbain, limitations différentes. */
export function mixedRoadTrip(): Trip {
  return {
    id: "trip-2",
    origin: "A",
    destination: "B",
    distanceKm: 120,
    referenceDurationMin: 60,
    date: "2026-01-01",
    segments: [
      {
        id: "seg-1",
        distanceKm: 100,
        roadType: "HIGHWAY",
        speedLimitKmh: 130,
      },
      {
        id: "seg-2",
        distanceKm: 20,
        roadType: "URBAN",
        speedLimitKmh: 50,
      },
    ],
  };
}
