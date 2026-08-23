import type { Scenario, ScenarioResult, Trip, VehicleProfile } from "../types";
import { evaluateScenario, type EvaluateScenarioOptions } from "./evaluateScenario";
import { buildGlobalSpeedFactorCandidates } from "./speedCandidates";
import { DEFAULT_SPEED_CONSTRAINTS } from "./speedConstraints";

export type GenerateScenariosOptions = Pick<EvaluateScenarioOptions, "speedConstraints" | "calibration">;

export interface GeneratedScenarios {
  fast: ScenarioResult;
  balanced: ScenarioResult;
  eco: ScenarioResult;
}

/**
 * Construit les trois scénarios de base :
 *  - FAST : vitesse légale maximale sur chaque segment (bornée par les contraintes de sécurité) ;
 *  - ECO : parmi tout le balayage de vitesses, celle qui minimise le coût énergétique
 *    (sans contrainte de temps — "économie maximale raisonnable", §12) ;
 *  - BALANCED : à mi-chemin entre FAST et ECO.
 * RECOMMENDED n'est pas généré ici : il dépend de la tolérance de temps de l'utilisateur,
 * voir recommendation.ts.
 */
export function generateScenarios(
  trip: Trip,
  vehicle: VehicleProfile,
  options: GenerateScenariosOptions = {}
): GeneratedScenarios {
  const speedConstraints = options.speedConstraints ?? DEFAULT_SPEED_CONSTRAINTS;
  const candidates = buildGlobalSpeedFactorCandidates(trip, speedConstraints);
  if (candidates.length === 0) {
    throw new Error("Aucune vitesse candidate n'a pu être générée pour ce trajet.");
  }

  const evalOptions: EvaluateScenarioOptions = { speedConstraints, calibration: options.calibration };

  const fastCandidate = candidates[0];
  const fastScenario: Scenario = { type: "FAST", segmentTargetSpeedsKmh: fastCandidate.segmentTargetSpeedsKmh };
  const fast = evaluateScenario(trip, vehicle, fastScenario, evalOptions);

  const evaluatedCandidates = candidates.map((candidate) =>
    evaluateScenario(
      trip,
      vehicle,
      { type: "ECO", segmentTargetSpeedsKmh: candidate.segmentTargetSpeedsKmh },
      { ...evalOptions, baseline: fast }
    )
  );

  const eco = evaluatedCandidates.reduce((best, current) => (current.costEuros < best.costEuros ? current : best));
  const ecoIndex = evaluatedCandidates.indexOf(eco);

  const balancedIndex = Math.round(ecoIndex / 2);
  const balancedCandidate = candidates[balancedIndex];
  const balanced = evaluateScenario(
    trip,
    vehicle,
    { type: "BALANCED", segmentTargetSpeedsKmh: balancedCandidate.segmentTargetSpeedsKmh },
    { ...evalOptions, baseline: fast }
  );

  return { fast, balanced, eco };
}
