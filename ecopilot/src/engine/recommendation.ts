import type { Scenario, ScenarioResult, Trip, UserPreferences, VehicleProfile } from "../types";
import { evaluateScenario, type EvaluateScenarioOptions } from "./evaluateScenario";
import { buildSpeedCandidates } from "./speedCandidates";
import { DEFAULT_SPEED_CONSTRAINTS } from "./speedConstraints";

export type SelectRecommendedScenarioOptions = Pick<EvaluateScenarioOptions, "speedConstraints" | "calibration">;

/**
 * selectRecommendedScenario — implémente l'algorithme du §11 :
 * "minimiser le coût énergétique sous contrainte de temps". Parmi tous les scénarios dont la
 * durée ne dépasse pas (durée du scénario FAST + tolérance utilisateur), retourne celui de
 * coût le plus faible. En cas d'égalité de coût, retient la durée la plus courte.
 *
 * Comme tous les autres scénarios, les vitesses candidates restent bornées par les contraintes
 * de sécurité/réglementation (§5 audit) — la minimisation du coût ne peut jamais les contourner.
 */
export function selectRecommendedScenario(
  trip: Trip,
  vehicle: VehicleProfile,
  preferences: UserPreferences,
  fast: ScenarioResult,
  options: SelectRecommendedScenarioOptions = {}
): ScenarioResult {
  const speedConstraints = options.speedConstraints ?? DEFAULT_SPEED_CONSTRAINTS;
  const candidates = buildSpeedCandidates(trip, speedConstraints);
  const maxDurationMin = fast.durationMin + preferences.timeToleranceMin;
  const evalOptions: EvaluateScenarioOptions = { speedConstraints, calibration: options.calibration, baseline: fast };

  const withinTolerance = candidates
    .map((candidate) => {
      const scenario: Scenario = { type: "RECOMMENDED", segmentTargetSpeedsKmh: candidate.segmentTargetSpeedsKmh };
      return evaluateScenario(trip, vehicle, scenario, evalOptions);
    })
    .filter((result) => result.durationMin <= maxDurationMin);

  const pool = withinTolerance.length > 0 ? withinTolerance : [fast];

  return pool.reduce((best, current) => {
    if (current.costEuros < best.costEuros) return current;
    if (current.costEuros === best.costEuros && current.durationMin < best.durationMin) return current;
    return best;
  });
}
