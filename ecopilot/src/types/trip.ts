export type RoadType = "HIGHWAY" | "EXPRESSWAY" | "MAIN_ROAD" | "URBAN" | "RURAL";

export interface RouteSegment {
  id: string;
  distanceKm: number;
  roadType: RoadType;
  speedLimitKmh: number;
  /** Vitesse visée par une stratégie donnée : décision du scénario, jamais > speedLimitKmh. */
  targetSpeedKmh: number;
  /**
   * Vitesse moyenne effectivement atteignable une fois le trafic/les ralentissements pris
   * en compte. En V0, égale à targetSpeedKmh (facteur d'atténuation = 1.0, pas de trafic modélisé).
   */
  estimatedAverageSpeedKmh: number;
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
