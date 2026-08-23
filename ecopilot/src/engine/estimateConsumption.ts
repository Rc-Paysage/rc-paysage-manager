import type { RouteSegment, VehicleProfile } from "../types";
import { interpolateConsumption } from "./consumptionCurve";
import { ELECTRIC_DISTANCE_FRACTION_BY_ROAD_TYPE, REGEN_RECOVERY_RATIO } from "./constants";

export interface SegmentConsumptionEstimate {
  fuelLiters: number;
  electricEnergyKwh: number;
  electricDistanceKm: number;
  energyRecoveredKwh: number;
  durationMin: number;
  /** true si une partie du calcul repose sur des constantes ESTIMATED_UNCALIBRATED. */
  isUncalibrated: boolean;
}

/**
 * Estime la consommation d'un segment à sa vitesse moyenne estimée (pas la vitesse cible :
 * cf. types/trip.ts — les deux peuvent différer une fois le trafic modélisé).
 */
export function estimateConsumption(
  segment: RouteSegment,
  vehicle: VehicleProfile
): SegmentConsumptionEstimate {
  const speed = segment.estimatedAverageSpeedKmh;
  if (speed <= 0) {
    throw new Error("La vitesse moyenne estimée doit être positive.");
  }

  const interpolated = interpolateConsumption(vehicle.consumptionCurve, speed);
  const durationMin = (segment.distanceKm / speed) * 60;

  const isHybridOrElectric = vehicle.energyType !== "PETROL" && vehicle.energyType !== "DIESEL";
  const electricFraction = isHybridOrElectric
    ? vehicle.energyType === "ELECTRIC"
      ? 1
      : (ELECTRIC_DISTANCE_FRACTION_BY_ROAD_TYPE[segment.roadType] ?? 0)
    : 0;

  const electricDistanceKm = segment.distanceKm * electricFraction;
  const fuelDistanceKm = segment.distanceKm - electricDistanceKm;

  const fuelLiters = (fuelDistanceKm * interpolated.litersPer100km) / 100;
  const electricEnergyKwh = (electricDistanceKm * interpolated.electricKwhPer100km) / 100;
  const energyRecoveredKwh = electricEnergyKwh * REGEN_RECOVERY_RATIO;

  return {
    fuelLiters,
    electricEnergyKwh,
    electricDistanceKm,
    energyRecoveredKwh,
    durationMin,
    isUncalibrated: interpolated.source === "ESTIMATED_UNCALIBRATED" || isHybridOrElectric,
  };
}
