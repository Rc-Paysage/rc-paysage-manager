/**
 * Dernière prédiction EcoPilot (scénario recommandé) générée par l'utilisateur, conservée pour
 * que le Test Lab puisse comparer prévision vs réalité (§17) sans ressaisie manuelle.
 */
export interface LastPrediction {
  vehicleId: string;
  tripId: string;
  distanceKm: number;
  predictedDurationMin: number;
  predictedFuelLiters: number;
  predictedElectricEnergyKwh: number;
  confidenceScore: number;
  savedAt: string;
}

const STORAGE_KEY = "ecopilot.lastPrediction";

export function saveLastPrediction(prediction: LastPrediction): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prediction));
}

export function loadLastPrediction(): LastPrediction | undefined {
  if (typeof window === "undefined") return undefined;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as LastPrediction;
  } catch {
    return undefined;
  }
}
