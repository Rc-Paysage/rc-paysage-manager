import type { CalibrationObservation, ConsumptionContext, SpeedBucketDefinition } from "../../types";
import { assignSpeedBucket, DEFAULT_SPEED_BUCKETS } from "./speedBuckets";

export type ClassificationExclusionReason =
  | "GLOBAL_BASELINE"
  | "MIXED_ROUTE"
  | "UNKNOWN_HOMOGENEITY"
  | "MISSING_ROAD_CONTEXT"
  | "MISSING_SPEED"
  | "SPEED_OUTSIDE_CONFIGURED_BUCKETS";

export type ObservationClassification =
  | { usable: true; roadContext: ConsumptionContext; speedBucket: SpeedBucketDefinition; representativeSpeedKmh: number }
  | { usable: false; reason: ClassificationExclusionReason };

/**
 * Décide si une observation peut alimenter un speedBucket précis (§5, §7 mission calibration).
 * Une observation reste TOUJOURS conservée dans l'historique quel que soit le résultat — cette
 * fonction ne fait que qualifier son usage pour la calibration, elle ne supprime ni ne modifie
 * rien.
 *
 * Exclusions volontaires :
 *  - GLOBAL_BASELINE : un relevé agrégé multi-contexte ne doit jamais créer un point précis (§15).
 *  - MIXED_ROUTE / UNKNOWN_HOMOGENEITY : un trajet non homogène (ou de nature inconnue) mélange
 *    des conditions trop différentes pour représenter un point de courbe fiable (§5).
 *  - MISSING_ROAD_CONTEXT / MISSING_SPEED : données insuffisantes pour situer l'observation.
 *  - SPEED_OUTSIDE_CONFIGURED_BUCKETS : aucune plage configurée ne couvre cette vitesse — on ne
 *    force jamais un rattachement approximatif (§6).
 *
 * Vitesse représentative : privilégie targetSpeedKmh (vitesse cible/stabilisée, un signal plus
 * délibéré) quand elle est disponible, sinon retombe sur averageSpeedKmh — mais seulement pour
 * un trajet déjà jugé HOMOGENEOUS, jamais pour un trajet mixte (§7).
 */
export function classifyObservationForCalibration(
  observation: CalibrationObservation,
  speedBuckets: SpeedBucketDefinition[] = DEFAULT_SPEED_BUCKETS
): ObservationClassification {
  if (observation.observationScope === "GLOBAL_BASELINE") {
    return { usable: false, reason: "GLOBAL_BASELINE" };
  }
  if (observation.routeHomogeneity === "MIXED") {
    return { usable: false, reason: "MIXED_ROUTE" };
  }
  if (observation.routeHomogeneity === "UNKNOWN") {
    return { usable: false, reason: "UNKNOWN_HOMOGENEITY" };
  }
  if (!observation.roadContext) {
    return { usable: false, reason: "MISSING_ROAD_CONTEXT" };
  }

  const representativeSpeedKmh = observation.targetSpeedKmh ?? observation.averageSpeedKmh;
  if (!(representativeSpeedKmh > 0)) {
    return { usable: false, reason: "MISSING_SPEED" };
  }

  const speedBucket = assignSpeedBucket(representativeSpeedKmh, speedBuckets);
  if (!speedBucket) {
    return { usable: false, reason: "SPEED_OUTSIDE_CONFIGURED_BUCKETS" };
  }

  return { usable: true, roadContext: observation.roadContext, speedBucket, representativeSpeedKmh };
}
