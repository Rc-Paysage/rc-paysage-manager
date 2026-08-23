export type PrimaryPriority = "TIME" | "COST" | "ENVIRONMENT" | "BALANCED";

export interface UserPreferences {
  primaryPriority: PrimaryPriority;
  /** Temps supplémentaire maximum accepté par rapport au scénario le plus rapide, en minutes. */
  timeToleranceMin: number;
  /**
   * Curseur -1 (priorité totale au temps) à +1 (priorité totale à l'économie).
   * Complète primaryPriority pour affiner l'arbitrage, sans le remplacer.
   */
  timeVsCostBalance: number;
  environmentallyConscious: boolean;
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  primaryPriority: "BALANCED",
  timeToleranceMin: 10,
  timeVsCostBalance: 0,
  environmentallyConscious: false,
};
