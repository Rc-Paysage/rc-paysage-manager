import type { Scenario, ScenarioResult, Trip, VehicleProfile } from "../types";
import { evaluateScenario } from "./evaluateScenario";
import { buildSpeedCandidates } from "./speedCandidates";

export interface GeneratedScenarios {
  fast: ScenarioResult;
  balanced: ScenarioResult;
  eco: ScenarioResult;
}

/**
 * Construit les trois scénarios de base :
 *  - FAST : vitesse légale maximale sur chaque segment ;
 *  - ECO : parmi tout le balayage de vitesses, celle qui minimise le coût énergétique
 *    (sans contrainte de temps — "économie maximale raisonnable", §12) ;
 *  - BALANCED : à mi-chemin entre FAST et ECO.
 * RECOMMENDED n'est pas généré ici : il dépend de la tolérance de temps de l'utilisateur,
 * voir recommendation.ts.
 */
export function generateScenarios(trip: Trip, vehicle: VehicleProfile): GeneratedScenarios {
  const candidates = buildSpeedCandidates(trip);
  if (candidates.length === 0) {
    throw new Error("Aucune vitesse candidate n'a pu être générée pour ce trajet.");
  }

  const fastCandidate = candidates[0];
  const fastScenario: Scenario = { type: "FAST", segmentTargetSpeedsKmh: fastCandidate.segmentTargetSpeedsKmh };
  const fast = evaluateScenario(trip, vehicle, fastScenario);

  const evaluatedCandidates = candidates.map((candidate) =>
    evaluateScenario(
      trip,
      vehicle,
      { type: "ECO", segmentTargetSpeedsKmh: candidate.segmentTargetSpeedsKmh },
      { baseline: fast }
    )
  );

  const ecoResult = evaluatedCandidates.reduce((best, current) =>
    current.costEuros < best.costEuros ? current : best
  );
  const ecoIndex = evaluatedCandidates.indexOf(ecoResult);
  const eco: ScenarioResult = { ...ecoResult, scenario: { ...ecoResult.scenario, type: "ECO" } };

  const balancedIndex = Math.round(ecoIndex / 2);
  const balancedCandidate = candidates[balancedIndex];
  const balanced = evaluateScenario(
    trip,
    vehicle,
    { type: "BALANCED", segmentTargetSpeedsKmh: balancedCandidate.segmentTargetSpeedsKmh },
    { baseline: fast }
  );

  return { fast, balanced, eco };
}
