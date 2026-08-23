import type { Trip } from "../types";
import { SPEED_FACTOR_STEP, SPEED_SWEEP_LOWER_BOUND_FACTOR } from "./constants";
import { clampToSafeSpeed, DEFAULT_SPEED_CONSTRAINTS, type SpeedConstraintTable } from "./speedConstraints";

export interface SpeedCandidate {
  /** Fraction de la limitation légale demandée avant clamp de sécurité (1.0 = vitesse légale max). */
  factor: number;
  segmentTargetSpeedsKmh: number[];
}

/**
 * Balaie les stratégies "vitesse cible = facteur x limitation légale" par segment, du facteur
 * 1.0 (vitesse légale max) jusqu'à SPEED_SWEEP_LOWER_BOUND_FACTOR, par pas de SPEED_FACTOR_STEP.
 * Permet de tester des vitesses intermédiaires (108, 112, 117 km/h...) plutôt que des paliers
 * fixes (§11).
 *
 * La borne basse du balayage n'est qu'une limite de boucle : chaque vitesse candidate est de
 * toute façon ramenée dans la plage sûre et légale du segment via `clampToSafeSpeed`, donc un
 * facteur bas appliqué à une autoroute ne produira jamais une vitesse en dessous de son
 * plancher réglementaire/raisonnable (§5 audit) — plusieurs facteurs peuvent alors converger
 * vers la même vitesse clampée, ce qui est correct.
 */
export function buildSpeedCandidates(
  trip: Trip,
  speedConstraints: SpeedConstraintTable = DEFAULT_SPEED_CONSTRAINTS
): SpeedCandidate[] {
  const candidates: SpeedCandidate[] = [];
  for (let factor = 1; factor >= SPEED_SWEEP_LOWER_BOUND_FACTOR - 1e-9; factor -= SPEED_FACTOR_STEP) {
    const roundedFactor = Math.round(factor * 100) / 100;
    candidates.push({
      factor: roundedFactor,
      segmentTargetSpeedsKmh: trip.segments.map((segment) =>
        clampToSafeSpeed(
          segment.roadType,
          segment.speedLimitKmh,
          segment.speedLimitKmh * roundedFactor,
          speedConstraints
        )
      ),
    });
  }
  return candidates;
}
