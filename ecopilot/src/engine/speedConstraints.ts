import type { RoadType } from "../types";

/**
 * Contraintes de vitesse "raisonnables" par type de voie, INDÉPENDANTES de la limitation légale
 * du segment (qui reste toujours le plafond absolu, cf. evaluateScenario). Objectif : empêcher
 * le moteur de recommander une vitesse dangereusement ou légalement basse au seul prétexte de
 * l'économie (§2.1 cahier des charges, §5 audit).
 *
 * Ces valeurs sont CONFIGURABLES (voir les paramètres `speedConstraints` de generateScenarios /
 * selectRecommendedScenario / evaluateScenario) et doivent être validées/ajustées selon la
 * réglementation réellement en vigueur. `minLegalSpeedKmh` n'est renseigné ici que pour
 * l'autoroute française (code de la route : vitesse minimale sur la voie de gauche par
 * conditions normales) — à confirmer avant tout usage réel. Pour les autres types de voie,
 * aucun minimum légal n'est supposé : `minReasonableSpeedKmh` n'est qu'un plancher de sécurité
 * et de fluidité du trafic, pas une règle de droit.
 */
export interface RoadTypeSpeedConstraint {
  /** Minimum légal connu pour ce type de voie, si applicable et vérifié. */
  minLegalSpeedKmh?: number;
  /** Plancher de sécurité/fluidité à respecter même sans minimum légal. */
  minReasonableSpeedKmh: number;
  /** Fraction minimale de la limitation légale du segment à ne jamais descendre en dessous. */
  minSpeedFactorOfLimit: number;
}

export type SpeedConstraintTable = Record<RoadType, RoadTypeSpeedConstraint>;

export const DEFAULT_SPEED_CONSTRAINTS: SpeedConstraintTable = {
  HIGHWAY: { minLegalSpeedKmh: 80, minReasonableSpeedKmh: 90, minSpeedFactorOfLimit: 0.7 },
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
  const floor = Math.max(
    constraint.minReasonableSpeedKmh,
    constraint.minLegalSpeedKmh ?? 0,
    speedLimitKmh * constraint.minSpeedFactorOfLimit
  );
  return Math.min(floor, speedLimitKmh);
}

/**
 * Ramène une vitesse cible demandée dans la plage sûre et légale du segment : jamais au-dessus
 * de la limitation légale (§2.1), jamais en dessous du plancher raisonnable/réglementaire du
 * type de voie (§5 audit).
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
