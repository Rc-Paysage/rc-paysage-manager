export type ScenarioType = "FAST" | "BALANCED" | "ECO" | "RECOMMENDED";

export interface Scenario {
  type: ScenarioType;
  /** Vitesse cible par segment pour cette stratégie, dans le même ordre que trip.segments. */
  segmentTargetSpeedsKmh: number[];
}

export interface ScenarioResult {
  scenario: Scenario;
  durationMin: number;
  /** Minutes en plus par rapport au scénario FAST. 0 pour le scénario FAST lui-même. */
  extraTimeMin: number;
  fuelLiters: number;
  electricEnergyKwh: number;
  electricDistanceKm: number;
  energyRecoveredKwh: number;
  costEuros: number;
  /** Économie en euros par rapport au scénario FAST. Peut être négative (FAST = 0). */
  savingsEuros: number;
  co2Grams: number;
  /** CO2 évité en grammes par rapport au scénario FAST. */
  co2AvoidedGrams: number;
  /** 0 à 1. Voir engine/confidence.ts pour la méthode de calcul. */
  confidenceScore: number;
}
