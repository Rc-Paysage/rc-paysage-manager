import type { RouteSegment, VehicleProfile } from "../types";
import { resolveConsumptionCurve, roadTypeToConsumptionContext } from "./consumptionContext";
import { interpolateConsumption } from "./consumptionCurve";
import { ELECTRIC_DISTANCE_FRACTION_BY_ROAD_TYPE } from "./constants";

export interface SegmentConsumptionEstimate {
  fuelLiters: number;
  /**
   * Énergie électrique utilisée (kWh) — métrique ANALYTIQUE/de calibration uniquement pour un
   * FULL_HYBRID non rechargeable. Ne représente pas une énergie achetée séparément : voir
   * `energySource.ts`. N'est PAS soustraite de `fuelLiters` (§1 audit).
   */
  electricEnergyKwh: number;
  /**
   * Distance parcourue en tout-électrique (kWh) — métrique ANALYTIQUE/de calibration
   * uniquement. Un FULL_HYBRID non rechargeable n'a pas de kilomètres "gratuits" : sa
   * consommation carburant globale (`fuelLiters`) porte déjà sur la distance entière du
   * segment (§1 audit). Cette valeur ne sert donc jamais à réduire `fuelLiters`.
   */
  electricDistanceKm: number;
  durationMin: number;
  estimatedAverageSpeedKmh: number;
  /** true si une partie du calcul repose sur des constantes ESTIMATED_UNCALIBRATED. */
  isUncalibrated: boolean;
}

/**
 * Estime la consommation d'un segment à une vitesse cible donnée. `RouteSegment` ne porte que
 * les caractéristiques intrinsèques de la route (§1 audit initial) : la vitesse cible est un
 * choix de scénario, fourni séparément par l'appelant (voir `evaluateScenario.ts`, qui la
 * ramène d'abord dans la plage sûre du segment via `speedConstraints.ts`).
 *
 * Modèle FULL_HYBRID non rechargeable (§1 audit correctif) : `defaultConsumptionCurve` /
 * `consumptionProfiles` représentent la consommation carburant GLOBALE du véhicule (essence +
 * électrique interne au système hybride confondus) sur l'intégralité de la distance parcourue.
 * `electricDistanceKm`/`electricEnergyKwh` restent calculés (toujours via la même heuristique
 * ESTIMATED_UNCALIBRATED par type de route) mais ne sont que des métriques analytiques/de
 * calibration : ils ne réduisent jamais `fuelLiters`, qui porte toujours sur
 * `segment.distanceKm` en entier. Aucune prédiction d'énergie récupérée au freinage
 * (energyRecoveredKwh) n'est produite ici : ce n'est pas modélisable de façon fiable en V0,
 * voir Test Lab pour la saisie de la valeur réellement affichée par le véhicule.
 *
 * La vitesse moyenne réellement atteignable est calculée ici — en V0 elle est identique à la
 * vitesse cible, faute de modélisation du trafic (`segment.trafficFactor` n'est pas encore
 * exploité, cf. §8 cahier des charges).
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

  // Métriques analytiques/de calibration uniquement — ne réduisent jamais fuelLiters (§1 audit).
  const electricDistanceKm = segment.distanceKm * electricFraction;
  const electricEnergyKwh = (electricDistanceKm * interpolated.electricKwhPer100km) / 100;

  // La courbe représente la consommation globale du véhicule sur la distance ENTIÈRE du
  // segment, pas seulement la part "carburant" — donc pas de soustraction d'electricDistanceKm.
  const fuelLiters = (segment.distanceKm * interpolated.litersPer100km) / 100;

  return {
    fuelLiters,
    electricEnergyKwh,
    electricDistanceKm,
    durationMin,
    estimatedAverageSpeedKmh,
    isUncalibrated: interpolated.source === "ESTIMATED_UNCALIBRATED" || isHybridOrElectric,
  };
}
