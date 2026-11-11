import type { TimeAnchorStatus } from "../types";

/**
 * Dernière recommandation EcoPilot, conservée pour le mode Conduite (/conduite) qui doit
 * s'afficher sans aucune interaction ni recalcul au volant (§14 cahier des charges).
 */
export interface LastRecommendation {
  destination: string;
  distanceKm: number;
  /** Vitesse cible par type de route rencontré, ex. { HIGHWAY: 112, URBAN: 50 }. */
  targetSpeedsByRoadType: Record<string, number>;
  anchoredDurationMin: number;
  extraTimeMin: number;
  savingsEuros: number;
  fuelSavedLiters: number;
  co2AvoidedGrams: number;
  timeAnchorStatus: TimeAnchorStatus;
  savedAt: string;
}

const STORAGE_KEY = "ecopilot.lastRecommendation";

export function saveLastRecommendation(recommendation: LastRecommendation): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(recommendation));
}

export function loadLastRecommendation(): LastRecommendation | undefined {
  if (typeof window === "undefined") return undefined;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as LastRecommendation;
  } catch {
    return undefined;
  }
}
