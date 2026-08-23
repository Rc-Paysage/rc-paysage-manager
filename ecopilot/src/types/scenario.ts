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

/**
 * État de l'ancrage temporel additif (§ correctif modèle temporel) : permet de savoir si
 * `anchoredDurationMin` reflète réellement une référence GPS/manuelle exploitable.
 *  - APPLIED : `Trip.referenceDurationMin` était exploitable, le délai fixe a été appliqué.
 *  - NO_REFERENCE : aucune référence exploitable (absente, nulle ou négative) — pas
 *    d'ancrage, `anchoredDurationMin` === `theoreticalDurationMin`.
 *  - REFERENCE_BELOW_THEORETICAL : la référence était inférieure à la durée théorique du
 *    scénario FAST (jamais de délai négatif) — pas d'ancrage, à signaler pour diagnostic.
 */
export type TimeAnchorStatus = "APPLIED" | "NO_REFERENCE" | "REFERENCE_BELOW_THEORETICAL";

export interface ScenarioResult {
  scenario: Scenario;
  /**
   * Durée issue du seul modèle distance/vitesse (§8 cahier des charges) — PAS une estimation
   * réaliste de navigation. Conservée pour l'audit du moteur et le Test Lab/debug ; ne pas
   * l'afficher dans l'interface principale (voir `anchoredDurationMin`).
   */
  theoreticalDurationMin: number;
  /**
   * Durée théorique corrigée par un délai fixe additif ancré sur `Trip.referenceDurationMin`
   * (voir `engine/timeAnchor.ts`) — c'est la durée à présenter à l'utilisateur.
   * `anchoredDurationMin_FAST` == `referenceDurationMin` quand `timeAnchorStatus` === "APPLIED".
   */
  anchoredDurationMin: number;
  /** Voir TimeAnchorStatus. Identique pour tous les scénarios d'un même trajet. */
  timeAnchorStatus: TimeAnchorStatus;
  /**
   * Minutes ancrées en plus par rapport au scénario FAST (`anchoredDurationMin` - `anchoredDurationMin`
   * du FAST). Toujours 0 pour le scénario FAST lui-même.
   */
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
