/**
 * Constantes du moteur V0. Toute valeur marquée ESTIMATED_UNCALIBRATED est un point de départ
 * pour permettre au moteur de tourner avant calibration réelle (cf. cahier des charges §9) —
 * à remplacer/affiner via le Test Lab, jamais à présenter comme une mesure exacte.
 */

/** Résolution du balayage de vitesses candidates : 1% de la limitation à chaque pas. */
export const SPEED_FACTOR_STEP = 0.01;

/** Vitesse minimale testée, en fraction de la limitation légale du segment. */
export const SPEED_FACTOR_FLOOR = 0.6;

/** Plancher de sécurité absolu : jamais de vitesse cible en dessous, quel que soit le segment. */
export const MIN_SEGMENT_SPEED_KMH = 20;

/**
 * ESTIMATED_UNCALIBRATED — fraction de distance parcourue en tout-électrique pour un hybride
 * "full hybrid" selon le type de route. Un hybride récupère et utilise plus l'électrique en
 * roulage urbain saccadé qu'à vitesse stabilisée sur autoroute. À recalibrer par véhicule.
 */
export const ELECTRIC_DISTANCE_FRACTION_BY_ROAD_TYPE: Record<string, number> = {
  URBAN: 0.4,
  RURAL: 0.2,
  MAIN_ROAD: 0.1,
  EXPRESSWAY: 0.05,
  HIGHWAY: 0.02,
};

/**
 * ESTIMATED_UNCALIBRATED — part de l'énergie électrique consommée sur un segment qui provient
 * de récupération (freinage régénératif) plutôt que du réseau/de la charge initiale.
 */
export const REGEN_RECOVERY_RATIO = 0.35;
