import type { SpeedBucketDefinition } from "../../types";

/**
 * Configuration des plages de vitesse représentatives — PAS une vérité universelle (§6 mission
 * calibration). Remplaçable/étendable sans toucher au code : passer une table personnalisée à
 * assignSpeedBucket()/groupComparableObservations() pour travailler avec 105/112/117 km/h ou
 * toute autre découpe, y compris en dehors du contexte autoroutier illustré ici.
 */
export const DEFAULT_SPEED_BUCKETS: SpeedBucketDefinition[] = [
  { id: "90", representativeSpeedKmh: 90, minSpeedKmh: 85, maxSpeedKmh: 95 },
  { id: "100", representativeSpeedKmh: 100, minSpeedKmh: 95, maxSpeedKmh: 105 },
  { id: "110", representativeSpeedKmh: 110, minSpeedKmh: 105, maxSpeedKmh: 115 },
  { id: "120", representativeSpeedKmh: 120, minSpeedKmh: 115, maxSpeedKmh: 125 },
  { id: "130", representativeSpeedKmh: 130, minSpeedKmh: 125, maxSpeedKmh: 135 },
];

/**
 * Associe une vitesse représentative à une plage configurée, ou `undefined` si elle ne tombe
 * dans aucune plage connue — ne force jamais un rattachement au bucket le plus proche, ce qui
 * fabriquerait une précision que les données ne permettent pas.
 */
export function assignSpeedBucket(
  speedKmh: number,
  buckets: SpeedBucketDefinition[] = DEFAULT_SPEED_BUCKETS
): SpeedBucketDefinition | undefined {
  return buckets.find((bucket) => speedKmh >= bucket.minSpeedKmh && speedKmh <= bucket.maxSpeedKmh);
}
