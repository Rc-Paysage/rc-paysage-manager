import type { RouteSegment, VehicleProfile } from "../types";
import { resolveConsumptionCurve, roadTypeToConsumptionContext } from "./consumptionContext";
import { interpolateConsumption } from "./consumptionCurve";
import { ELECTRIC_DISTANCE_FRACTION_BY_ROAD_TYPE, REGEN_RECOVERY_RATIO } from "./constants";

export interface SegmentConsumptionEstimate {
  fuelLiters: number;
  electricEnergyKwh: number;
  electricDistanceKm: number;
  energyRecoveredKwh: number;
  durationMin: number;
  estimatedAverageSpeedKmh: number;
  /** true si une partie du calcul repose sur des constantes ESTIMATED_UNCALIBRATED. */
  isUncalibrated: boolean;
}

/**
 * Estime la consommation d'un segment à une vitesse cible donnée. `RouteSegment` ne porte que
 * les caractéristiques intrinsèques de la route (§1 audit) : la vitesse cible est un choix de
 * scénario, fourni séparément par l'appelant (voir `evaluateScenario.ts`, qui la ramène d'abord
 * dans la plage sûre du segment via `speedConstraints.ts`).
 *
 * La vitesse moyenne réellement atteignable est calculée ici — en V0 elle est identique à la
 * vitesse cible, faute de modélisation du trafic (`segment.trafficFactor` n'est pas encore
 * exploité, cf. §8 cahier des charges). Cette fonction reste le seul endroit à modifier quand
 * un modèle de trafic sera ajouté, sans changer la forme de `RouteSegment` ni de `Scenario`.
 */
export function estimateConsumption(
  segment: RouteSegment,
  targetSpeedKmh: number,
  vehicle: VehicleProfile
): SegmentConsumptionEstimate {
  if (targetSpeedKmh <= 0) {
    throw new Error("La vitesse cible doit être positive.");
  }

  const estimatedAverageSpeedKmh = targetSpeedKmh;

  const context = roadTypeToConsumptionContext(segment.roadType);
  const curve = resolveConsumptionCurve(vehicle, context);
  const interpolated = interpolateConsumption(curve, estimatedAverageSpeedKmh);
  const durationMin = (segment.distanceKm / estimatedAverageSpeedKmh) * 60;

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
    estimatedAverageSpeedKmh,
    isUncalibrated: interpolated.source === "ESTIMATED_UNCALIBRATED" || isHybridOrElectric,
  };
}
