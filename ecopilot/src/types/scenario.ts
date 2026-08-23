export type ScenarioType = "FAST" | "BALANCED" | "ECO" | "RECOMMENDED";

export interface Scenario {
  type: ScenarioType;
  /** Vitesse cible par segment pour cette stratégie, dans le même ordre que trip.segments. */
  segmentTargetSpeedsKmh: number[];
}

/**
 * Fourchette d'incertitude sur le coût estimé. Volontairement distincte de `confidenceScore` :
 * la confiance est une heuristique globale sur la qualité du profil, alors que cette fourchette
 * doit refléter une dispersion RÉELLEMENT OBSERVÉE (erreurs de prédiction passées), jamais une
 * déduction artificielle du score de confiance (§4 audit). Tant qu'il n'y a pas assez de
 * relevés comparables, le statut reste PROVISIONAL plutôt que d'inventer des bornes.
 */
export type UncertaintyRange =
  | { status: "PROVISIONAL" }
  | { status: "CALCULATED"; lowEuros: number; highEuros: number; basisSampleCount: number };

export interface ScenarioResult {
  scenario: Scenario;
  /**
   * Durée issue du seul modèle distance/vitesse (§8 cahier des charges) — PAS une estimation
   * réaliste de navigation. Distincte de `Trip.referenceDurationMin` (durée de référence
   * GPS/saisie manuelle). Aucun ancrage sur `referenceDurationMin` n'est encore implémenté en
   * V0 (§3 audit correctif — proposition en attente de validation) ; `extraTimeMin` en dérive
   * donc pour l'instant.
   */
  theoreticalDurationMin: number;
  /** Minutes théoriques en plus par rapport au scénario FAST. 0 pour le scénario FAST lui-même. */
  extraTimeMin: number;
  fuelLiters: number;
  /**
   * Énergie électrique utilisée (kWh) — métrique ANALYTIQUE/de calibration uniquement pour un
   * hybride non rechargeable (elle ne représente pas une énergie achetée séparément — voir
   * engine/energySource.ts) et n'est jamais soustraite de `fuelLiters` (§1 audit correctif : la
   * courbe de consommation couvre déjà la distance entière du segment). Ne pas additionner à
   * costEuros/co2Grams sans vérifier `isElectricityExternalEnergy(vehicle)`.
   */
  electricEnergyKwh: number;
  /** Distance parcourue en tout-électrique — métrique ANALYTIQUE/de calibration uniquement, ne réduit jamais fuelLiters. */
  electricDistanceKm: number;
  costEuros: number;
  /** Économie en euros par rapport au scénario FAST. Peut être négative (FAST = 0). */
  savingsEuros: number;
  co2Grams: number;
  /** CO2 évité en grammes par rapport au scénario FAST. */
  co2AvoidedGrams: number;
  /** 0 à 1. Heuristique de qualité globale du profil — voir engine/confidence.ts. */
  confidenceScore: number;
  /** Fourchette de coût, réellement calculée ou explicitement provisoire — voir engine/uncertainty.ts. */
  uncertaintyRange: UncertaintyRange;
}
