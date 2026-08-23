/**
 * Constantes du moteur V0. Toute valeur marquée ESTIMATED_UNCALIBRATED est un point de départ
 * pour permettre au moteur de tourner avant calibration réelle (cf. cahier des charges §9) —
 * à remplacer/affiner via le Test Lab, jamais à présenter comme une mesure exacte.
 *
 * Les contraintes de sécurité/réglementation par type de voie ne sont PAS ici : voir
 * `speedConstraints.ts`. Les constantes ci-dessous ne concernent que la résolution du balayage
 * de vitesses candidates, pas la sécurité.
 */

/** Résolution du balayage de vitesses candidates : 1% de la limitation à chaque pas. */
export const SPEED_FACTOR_STEP = 0.01;

/**
 * Borne basse du balayage de facteurs — une simple limite de boucle, PAS un mécanisme de
 * sécurité : chaque vitesse candidate est de toute façon ramenée dans la plage sûre du segment
 * via `clampToSafeSpeed` (speedConstraints.ts) avant tout calcul.
 */
export const SPEED_SWEEP_LOWER_BOUND_FACTOR = 0.4;

/**
 * ESTIMATED_UNCALIBRATED — fraction de distance parcourue en tout-électrique pour un hybride
 * "full hybrid" selon le type de route. Un hybride récupère et utilise plus l'électrique en
 * roulage urbain saccadé qu'à vitesse stabilisée sur autoroute. À recalibrer par véhicule.
 *
 * IMPORTANT (§1 audit V0 — correctif) : cette fraction sert uniquement à ESTIMER
 * electricDistanceKm/electricEnergyKwh comme métriques analytiques/de calibration. Pour un
 * FULL_HYBRID non rechargeable, `defaultConsumptionCurve.litersPer100km` représente déjà la
 * consommation carburant globale du véhicule sur l'intégralité de la distance — cette fraction
 * ne doit JAMAIS servir à retrancher des kilomètres du calcul du carburant (voir
 * estimateConsumption.ts).
 */
export const ELECTRIC_DISTANCE_FRACTION_BY_ROAD_TYPE: Record<string, number> = {
  URBAN: 0.4,
  RURAL: 0.2,
  MAIN_ROAD: 0.1,
  EXPRESSWAY: 0.05,
  HIGHWAY: 0.02,
};
