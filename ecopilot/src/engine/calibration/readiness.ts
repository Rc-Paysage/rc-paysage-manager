import type { CalibrationReadinessLevel } from "../../types";

/**
 * Seuils de décision pour CalibrationReadiness (§11 mission calibration).
 * IMPORTANT : ces seuils sont nécessairement HEURISTIQUES en V0 — non validés scientifiquement,
 * centralisés ici plutôt que dispersés dans le code métier, et remplaçables via un paramètre.
 * Ils devront être révisés une fois les premiers relevés terrain du Captur disponibles.
 */
export interface CalibrationReadinessThresholds {
  /** En dessous, pas assez d'observations pour même commencer à évaluer une tendance. */
  minObservationsForCollecting: number;
  minObservationsForCandidate: number;
  minObservationsForCalibrated: number;
  minDistanceKmForCandidate: number;
  minDistanceKmForCalibrated: number;
  /** Ratio MAD / médiane toléré (dispersion relative) pour rester au moins CANDIDATE. */
  maxDispersionRatioForCandidate: number;
  /** Ratio MAD / médiane maximal pour atteindre CALIBRATED — plus strict que ci-dessus. */
  maxDispersionRatioForCalibrated: number;
  /** Part maximale d'observations exclues (aberrations) tolérée pour atteindre CALIBRATED. */
  maxExcludedRatioForCalibrated: number;
}

export const DEFAULT_CALIBRATION_READINESS_THRESHOLDS: CalibrationReadinessThresholds = {
  minObservationsForCollecting: 2,
  minObservationsForCandidate: 5,
  minObservationsForCalibrated: 10,
  minDistanceKmForCandidate: 300,
  minDistanceKmForCalibrated: 800,
  maxDispersionRatioForCandidate: 0.15,
  maxDispersionRatioForCalibrated: 0.08,
  maxExcludedRatioForCalibrated: 0.2,
};

export interface CalibrationReadinessInputs {
  /** Nombre d'observations retenues (hors aberrations exclues) pour ce groupe. */
  observationCount: number;
  /** Distance cumulée des observations retenues. */
  totalDistanceKm: number;
  /** MAD / médiane des observations retenues — 0 si la médiane est nulle. */
  dispersionRatio: number;
  /** Part d'observations du pool initial exclues comme aberrantes (0 à 1). */
  excludedRatio: number;
}

/**
 * Une observation individuelle (observationCount = 1) ne peut jamais dépasser COLLECTING : les
 * seuils par défaut exigent au minimum 5 observations pour CANDIDATE, ce qui empêche
 * structurellement qu'un seul trajet ne produise un point CALIBRATED (§2, Test A).
 */
export function calculateCalibrationReadiness(
  inputs: CalibrationReadinessInputs,
  thresholds: CalibrationReadinessThresholds = DEFAULT_CALIBRATION_READINESS_THRESHOLDS
): CalibrationReadinessLevel {
  if (inputs.observationCount < thresholds.minObservationsForCollecting) {
    return "INSUFFICIENT_DATA";
  }

  const meetsCandidateVolume =
    inputs.observationCount >= thresholds.minObservationsForCandidate &&
    inputs.totalDistanceKm >= thresholds.minDistanceKmForCandidate &&
    inputs.dispersionRatio <= thresholds.maxDispersionRatioForCandidate;

  if (!meetsCandidateVolume) {
    return "COLLECTING";
  }

  const meetsCalibratedVolume =
    inputs.observationCount >= thresholds.minObservationsForCalibrated &&
    inputs.totalDistanceKm >= thresholds.minDistanceKmForCalibrated &&
    inputs.dispersionRatio <= thresholds.maxDispersionRatioForCalibrated &&
    inputs.excludedRatio <= thresholds.maxExcludedRatioForCalibrated;

  return meetsCalibratedVolume ? "CALIBRATED" : "CANDIDATE";
}
