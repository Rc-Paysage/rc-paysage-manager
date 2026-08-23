export type RoadType = "HIGHWAY" | "EXPRESSWAY" | "MAIN_ROAD" | "URBAN" | "RURAL";

/**
 * Caractéristiques INTRINSÈQUES d'une portion de route — rien qui dépende d'une stratégie de
 * conduite. La vitesse cible et la vitesse moyenne estimée ne vivent plus ici : elles sont
 * propres à chaque scénario et résolues au moment de l'évaluation, voir
 * `Scenario.segmentTargetSpeedsKmh` et `engine/evaluateScenario.ts` /
 * `engine/speedConstraints.ts` (audit V0 — un même segment est réutilisé par plusieurs
 * scénarios, il ne peut donc pas porter "la" vitesse cible).
 */
export interface RouteSegment {
  id: string;
  distanceKm: number;
  roadType: RoadType;
  speedLimitKmh: number;
  /** Dénivelé en mètres, positif = montée. Optionnel, non exploité en V0. */
  elevationGainM?: number;
  /** Indicateur de trafic 0 (fluide) à 1 (saturé). Optionnel, non exploité en V0. */
  trafficFactor?: number;
}

export interface Trip {
  id: string;
  origin: string;
  destination: string;
  distanceKm: number;
  /** Durée de référence (ex. estimation GPS "rapide"), en minutes. */
  referenceDurationMin: number;
  segments: RouteSegment[];
  date: string;
  conditions?: {
    temperatureC?: number;
    weather?: string;
  };
}
