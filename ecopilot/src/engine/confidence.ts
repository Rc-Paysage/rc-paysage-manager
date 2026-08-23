import type { VehicleProfile } from "../types";

export interface ConfidenceInputs {
  /** Nombre de trajets comparables (même type de route / plage de vitesse) déjà observés. */
  comparableTripCount?: number;
  /**
   * Erreurs relatives (réel - prédit) / prédit des derniers relevés Test Lab, les plus
   * récentes en dernier. Utilisées pour juger la stabilité des prédictions.
   */
  recentPredictionErrors?: number[];
}

/**
 * Heuristique simple et explicable, PAS une probabilité statistique validée (cf. §19).
 * Combine trois signaux, chacun borné à [0, 1] :
 *  - volume de calibration (km parcourus par le véhicule dans EcoPilot) ;
 *  - nombre de trajets comparables disponibles ;
 *  - stabilité des erreurs de prédiction récentes (faible variance = confiance plus haute).
 * Le score final est leur moyenne, donc croît avec plus de données et plus de stabilité.
 *
 * Volontairement indépendant de `uncertainty.ts` (§4 audit) : ce score est un indicateur
 * global de qualité du profil, pas une fourchette. Ne jamais déduire une fourchette de coût de
 * ce score — voir `calculateUncertaintyRange`, qui calcule (ou refuse de calculer) une
 * fourchette à partir des mêmes `recentPredictionErrors`, mais séparément.
 */
export function calculateConfidenceScore(
  vehicle: Pick<VehicleProfile, "calibrationDistanceKm" | "calibrationSampleCount">,
  inputs: ConfidenceInputs = {}
): number {
  const distanceSignal = clamp01(vehicle.calibrationDistanceKm / 2000);
  const sampleSignal = clamp01(vehicle.calibrationSampleCount / 20);
  const comparableSignal = clamp01((inputs.comparableTripCount ?? 0) / 10);

  const errors = inputs.recentPredictionErrors ?? [];
  const stabilitySignal = errors.length === 0 ? 0 : clamp01(1 - averageAbsolute(errors) * 4);

  const signals = [distanceSignal, sampleSignal, comparableSignal, stabilitySignal];
  const score = signals.reduce((sum, s) => sum + s, 0) / signals.length;
  return clamp01(score);
}

function averageAbsolute(values: number[]): number {
  return values.reduce((sum, v) => sum + Math.abs(v), 0) / values.length;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
