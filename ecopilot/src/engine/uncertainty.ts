import type { UncertaintyRange } from "../types";

/** Nombre minimal d'erreurs de prédiction comparables nécessaires avant de calculer une vraie fourchette. */
export const MIN_SAMPLES_FOR_UNCERTAINTY_RANGE = 5;

export interface UncertaintyInputs {
  /** Erreurs relatives (réel - prédit) / prédit des derniers relevés Test Lab comparables. */
  recentPredictionErrors?: number[];
}

/**
 * Calcule une fourchette d'incertitude à partir de la dispersion RÉELLEMENT OBSERVÉE des
 * erreurs de prédiction passées (bornes empiriques min/max), jamais déduite artificiellement du
 * score de confiance (§4 audit — confidenceScore et uncertaintyRange sont volontairement
 * indépendants). Tant que trop peu de relevés comparables existent, retourne PROVISIONAL plutôt
 * que d'inventer une fourchette : c'est le comportement par défaut du moteur V0 tant qu'aucun
 * historique de calibration comparable n'est fourni par l'appelant.
 */
export function calculateUncertaintyRange(
  pointEstimateEuros: number,
  inputs: UncertaintyInputs = {}
): UncertaintyRange {
  const errors = inputs.recentPredictionErrors ?? [];
  if (errors.length < MIN_SAMPLES_FOR_UNCERTAINTY_RANGE) {
    return { status: "PROVISIONAL" };
  }

  const minError = Math.min(...errors);
  const maxError = Math.max(...errors);
  const lowEuros = Math.max(0, pointEstimateEuros * (1 + minError));
  const highEuros = pointEstimateEuros * (1 + maxError);

  return {
    status: "CALCULATED",
    lowEuros: Math.min(lowEuros, highEuros),
    highEuros: Math.max(lowEuros, highEuros),
    basisSampleCount: errors.length,
  };
}
