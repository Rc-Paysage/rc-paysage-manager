import type { ConsumptionDispersion, RobustConsumptionMethod } from "../../types";

/**
 * Fonctions statistiques simples et explicables — volontairement AUCUN machine learning
 * (§8 mission calibration). Toutes pures, testables indépendamment.
 */

export function median(values: number[]): number {
  if (values.length === 0) {
    throw new Error("median() nécessite au moins une valeur.");
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export function arithmeticMean(values: number[]): number {
  if (values.length === 0) {
    throw new Error("arithmeticMean() nécessite au moins une valeur.");
  }
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/** MAD (Median Absolute Deviation) — mesure de dispersion robuste, peu sensible aux valeurs extrêmes. */
export function medianAbsoluteDeviation(values: number[], center: number = median(values)): number {
  const deviations = values.map((v) => Math.abs(v - center));
  return median(deviations);
}

export function calculateDispersion(values: number[]): ConsumptionDispersion {
  const med = median(values);
  const mean = arithmeticMean(values);
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return {
    minLPer100km: Math.min(...values),
    maxLPer100km: Math.max(...values),
    stdDevLPer100km: Math.sqrt(variance),
    medianAbsoluteDeviation: medianAbsoluteDeviation(values, med),
  };
}

export interface RobustConsumptionConfig {
  /**
   * En dessous de ce nombre d'observations, utiliser la médiane (robustesse maximale, aucune
   * hypothèse de distribution). HEURISTIQUE V0 — non validée statistiquement, à ajuster avec
   * l'expérience terrain.
   */
  minObservationsForTrimmedMean: number;
  /** Fraction retirée de chaque extrémité pour la moyenne tronquée, au-delà du seuil ci-dessus. */
  trimFraction: number;
}

export const DEFAULT_ROBUST_CONSUMPTION_CONFIG: RobustConsumptionConfig = {
  minObservationsForTrimmedMean: 10,
  trimFraction: 0.1,
};

export interface RobustConsumptionResult {
  value: number;
  method: RobustConsumptionMethod;
  sampleSize: number;
}

/**
 * Valeur centrale robuste (§9 mission calibration) : médiane pour peu d'observations, moyenne
 * tronquée au-delà d'un seuil configurable. Compromis explicite : la médiane ignore l'essentiel
 * de l'information disponible une fois qu'on a assez de données propres ; une moyenne tronquée
 * légère (10 % par défaut) réintroduit cette information tout en écartant les extrêmes, sans
 * supposer de loi de distribution particulière.
 */
export function calculateRobustConsumption(
  values: number[],
  config: RobustConsumptionConfig = DEFAULT_ROBUST_CONSUMPTION_CONFIG
): RobustConsumptionResult {
  if (values.length === 0) {
    throw new Error("calculateRobustConsumption() nécessite au moins une valeur.");
  }
  const sorted = [...values].sort((a, b) => a - b);

  if (sorted.length < config.minObservationsForTrimmedMean) {
    return { value: median(sorted), method: "MEDIAN", sampleSize: sorted.length };
  }

  const trimCount = Math.floor(sorted.length * config.trimFraction);
  const trimmed = trimCount > 0 ? sorted.slice(trimCount, sorted.length - trimCount) : sorted;

  if (trimmed.length === 0) {
    return { value: median(sorted), method: "MEDIAN", sampleSize: sorted.length };
  }

  return { value: arithmeticMean(trimmed), method: "TRIMMED_MEAN", sampleSize: sorted.length };
}

export interface OutlierCandidate {
  id: string;
  value: number;
}

export type OutlierDetectionMethod = "INSUFFICIENT_DATA" | "NO_DISPERSION" | "MODIFIED_Z_SCORE_MAD";

export interface OutlierDetectionResult {
  method: OutlierDetectionMethod;
  outlierIds: string[];
}

export interface OutlierDetectionConfig {
  /** Nombre minimal d'observations avant de tenter une détection. En dessous, on ne prétend
   * jamais qu'une valeur est aberrante (§10 mission calibration). */
  minObservationsRequired: number;
  /**
   * Seuil de z-score modifié (0.6745 * (x - médiane) / MAD). 3.5 est la valeur usuelle en
   * référence (Iglewicz & Hoaglin, 1993) — HEURISTIQUE V0, à ajuster avec l'expérience terrain.
   */
  modifiedZScoreThreshold: number;
}

export const DEFAULT_OUTLIER_DETECTION_CONFIG: OutlierDetectionConfig = {
  minObservationsRequired: 5,
  modifiedZScoreThreshold: 3.5,
};

/**
 * Détecte les observations statistiquement très différentes du groupe via un z-score modifié
 * basé sur la MAD plutôt qu'un z-score classique (moyenne/écart-type) : la MAD reste fiable
 * avec peu d'observations et n'est pas elle-même faussée par la valeur aberrante qu'on cherche
 * à détecter. Ne supprime jamais rien — retourne seulement les identifiants à exclure, avec la
 * méthode utilisée (ou l'absence de détection si les données ne le permettent pas).
 */
export function detectCalibrationOutliers(
  candidates: OutlierCandidate[],
  config: OutlierDetectionConfig = DEFAULT_OUTLIER_DETECTION_CONFIG
): OutlierDetectionResult {
  if (candidates.length < config.minObservationsRequired) {
    return { method: "INSUFFICIENT_DATA", outlierIds: [] };
  }

  const values = candidates.map((c) => c.value);
  const med = median(values);
  const mad = medianAbsoluteDeviation(values, med);

  if (mad === 0) {
    // Toutes les valeurs sont identiques (ou quasi) : rien à détecter, éviter une division par
    // zéro qui transformerait le moindre écart en "aberration" artificielle.
    return { method: "NO_DISPERSION", outlierIds: [] };
  }

  const outlierIds = candidates
    .filter((c) => Math.abs((0.6745 * (c.value - med)) / mad) > config.modifiedZScoreThreshold)
    .map((c) => c.id);

  return { method: "MODIFIED_Z_SCORE_MAD", outlierIds };
}
