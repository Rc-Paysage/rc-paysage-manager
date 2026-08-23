import type { Trip } from "../types";
import { MIN_SEGMENT_SPEED_KMH, SPEED_FACTOR_FLOOR, SPEED_FACTOR_STEP } from "./constants";

export interface SpeedCandidate {
  /** Fraction de la limitation légale appliquée à chaque segment (1.0 = vitesse légale max). */
  factor: number;
  segmentTargetSpeedsKmh: number[];
}

/**
 * Génère un balayage de stratégies "vitesse cible = facteur x limitation légale" par segment,
 * de la vitesse légale max (facteur 1.0) jusqu'au plancher SPEED_FACTOR_FLOOR, par pas de
 * SPEED_FACTOR_STEP. Permet de tester des vitesses intermédiaires (108, 112, 117 km/h...)
 * sans jamais dépasser la limitation légale d'un segment (§2.1, §11).
 */
export function buildSpeedCandidates(trip: Trip): SpeedCandidate[] {
  const candidates: SpeedCandidate[] = [];
  for (let factor = 1; factor >= SPEED_FACTOR_FLOOR - 1e-9; factor -= SPEED_FACTOR_STEP) {
    const roundedFactor = Math.round(factor * 100) / 100;
    candidates.push({
      factor: roundedFactor,
      segmentTargetSpeedsKmh: trip.segments.map((segment) =>
        Math.max(MIN_SEGMENT_SPEED_KMH, Math.round(segment.speedLimitKmh * roundedFactor))
      ),
    });
  }
  return candidates;
}
