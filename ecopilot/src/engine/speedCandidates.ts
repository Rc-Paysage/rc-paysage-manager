import type { Trip } from "../types";
import { SPEED_FACTOR_STEP, SPEED_SWEEP_LOWER_BOUND_FACTOR } from "./constants";
import { clampToSafeSpeed, DEFAULT_SPEED_CONSTRAINTS, type SpeedConstraintTable } from "./speedConstraints";

/**
 * Stratégies de génération de vitesses candidates que le moteur peut employer.
 *
 * - `GLOBAL_SPEED_FACTOR` (implémentée, V0) : un même facteur de la limitation légale est
 *   appliqué à TOUS les segments du trajet. Simple et suffisant pour valider le moteur, mais ce
 *   n'est PAS encore l'optimisation portion par portion visée par EcoPilot : deux segments aux
 *   caractéristiques très différentes (ex. autoroute dégagée vs voie rapide vallonnée) reçoivent
 *   mécaniquement le même facteur, alors que le coût marginal d'un km/h en moins peut différer
 *   fortement de l'un à l'autre.
 * - `PER_SEGMENT_OPTIMIZATION` (§2 audit — NON IMPLÉMENTÉE) : direction future où chaque segment
 *   aurait sa propre vitesse optimisée indépendamment des autres, sous la même contrainte de
 *   temps globale sur le trajet (ex. ralentir davantage sur le segment où l'économie marginale
 *   est la plus grande, rouler au plus efficace ailleurs). Cela demande un algorithme de
 *   répartition d'un "budget temps" entre segments (ex. programmation gloutonne ou dynamique sur
 *   la courbe coût/vitesse de chaque segment) qui n'existe pas encore. Documenté ici comme point
 *   d'extension : `buildGlobalSpeedFactorCandidates` devra être complété par un
 *   `buildPerSegmentOptimizationCandidates` (ou équivalent) implémentant cette stratégie, sans
 *   changer la signature de `evaluateScenario`/`Scenario.segmentTargetSpeedsKmh`, qui supporte
 *   déjà des vitesses indépendantes par segment.
 */
export type SpeedOptimizationStrategy = "GLOBAL_SPEED_FACTOR" | "PER_SEGMENT_OPTIMIZATION";

/** Stratégie effectivement utilisée par le moteur V0 — voir SpeedOptimizationStrategy ci-dessus. */
export const CURRENT_SPEED_OPTIMIZATION_STRATEGY: SpeedOptimizationStrategy = "GLOBAL_SPEED_FACTOR";

export interface SpeedCandidate {
  /** Fraction de la limitation légale demandée avant clamp de sécurité (1.0 = vitesse légale max). */
  factor: number;
  segmentTargetSpeedsKmh: number[];
}

/**
 * Implémente la stratégie GLOBAL_SPEED_FACTOR (voir SpeedOptimizationStrategy ci-dessus) :
 * balaie "vitesse cible = facteur x limitation légale", le MÊME facteur appliqué à chaque
 * segment, du facteur 1.0 (vitesse légale max) jusqu'à SPEED_SWEEP_LOWER_BOUND_FACTOR, par pas
 * de SPEED_FACTOR_STEP. Permet de tester des vitesses intermédiaires (108, 112, 117 km/h...)
 * plutôt que des paliers fixes (§11 cahier des charges) — mais reste une optimisation globale
 * du trajet, pas portion par portion (voir PER_SEGMENT_OPTIMIZATION, non implémentée).
 *
 * La borne basse du balayage n'est qu'une limite de boucle : chaque vitesse candidate est de
 * toute façon ramenée dans la plage sûre et légale du segment via `clampToSafeSpeed`, donc un
 * facteur bas appliqué à une autoroute ne produira jamais une vitesse en dessous de son
 * plancher opérationnel (§5 audit initial / §4 audit correctif) — plusieurs facteurs peuvent
 * alors converger vers la même vitesse clampée, ce qui est correct.
 */
export function buildGlobalSpeedFactorCandidates(
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
