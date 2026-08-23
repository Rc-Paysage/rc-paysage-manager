import type { RoadType } from "../types";

/**
 * Planchers de vitesse "opérationnels" par type de voie — des paramètres PRODUIT/SÉCURITÉ
 * configurables, PAS des règles juridiques. Objectif : empêcher le moteur de recommander une
 * vitesse anormalement basse (gêne, insécurité perçue, sortie de la plage réaliste) au seul
 * prétexte de l'économie (§2.1 cahier des charges, §5 audit initial).
 *
 * §4 audit correctif : une version antérieure incluait `minLegalSpeedKmh: 80` pour l'autoroute
 * en le présentant comme un minimum légal général. C'est FAUX : en France, l'article R413-19 du
 * code de la route fixe 80 km/h uniquement pour la voie la plus à gauche de l'autoroute, quand
 * la circulation est fluide et les conditions le permettent — ce n'est pas une vitesse minimale
 * applicable à toute voie d'autoroute ni à tout segment. Ce champ a donc été retiré : ces
 * valeurs sont désormais explicitement des planchers produit/UX à valider, jamais présentées
 * comme une obligation réglementaire. Toute contrainte légale réelle (si elle existe pour un
 * type de voie donné) devra être réintroduite séparément, sourcée et vérifiée avant usage.
 */
export interface RoadTypeSpeedConstraint {
  /** Plancher opérationnel produit/sécurité — À VALIDER, pas une règle de droit. */
  minReasonableSpeedKmh: number;
  /** Fraction minimale de la limitation légale du segment à ne jamais descendre en dessous. */
  minSpeedFactorOfLimit: number;
}

export type SpeedConstraintTable = Record<RoadType, RoadTypeSpeedConstraint>;

export const DEFAULT_SPEED_CONSTRAINTS: SpeedConstraintTable = {
  HIGHWAY: { minReasonableSpeedKmh: 90, minSpeedFactorOfLimit: 0.7 },
  EXPRESSWAY: { minReasonableSpeedKmh: 70, minSpeedFactorOfLimit: 0.65 },
  MAIN_ROAD: { minReasonableSpeedKmh: 50, minSpeedFactorOfLimit: 0.6 },
  RURAL: { minReasonableSpeedKmh: 40, minSpeedFactorOfLimit: 0.6 },
  URBAN: { minReasonableSpeedKmh: 20, minSpeedFactorOfLimit: 0.5 },
};

/** Vitesse minimale à respecter sur ce segment, jamais supérieure à sa limitation légale. */
export function resolveMinSpeedKmh(
  roadType: RoadType,
  speedLimitKmh: number,
  constraints: SpeedConstraintTable = DEFAULT_SPEED_CONSTRAINTS
): number {
  const constraint = constraints[roadType];
  const floor = Math.max(constraint.minReasonableSpeedKmh, speedLimitKmh * constraint.minSpeedFactorOfLimit);
  return Math.min(floor, speedLimitKmh);
}

/**
 * Ramène une vitesse cible demandée dans la plage sûre et légale du segment : jamais au-dessus
 * de la limitation légale (§2.1), jamais en dessous du plancher opérationnel du type de voie
 * (§5 audit initial / §4 audit correctif).
 */
export function clampToSafeSpeed(
  roadType: RoadType,
  speedLimitKmh: number,
  requestedSpeedKmh: number,
  constraints: SpeedConstraintTable = DEFAULT_SPEED_CONSTRAINTS
): number {
  const minSpeed = resolveMinSpeedKmh(roadType, speedLimitKmh, constraints);
  return Math.min(speedLimitKmh, Math.max(minSpeed, requestedSpeedKmh));
}
