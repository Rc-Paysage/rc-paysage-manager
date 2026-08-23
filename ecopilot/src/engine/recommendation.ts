import type { Scenario, ScenarioResult, Trip, UserPreferences, VehicleProfile } from "../types";
import { evaluateScenario } from "./evaluateScenario";
import { buildSpeedCandidates } from "./speedCandidates";

/**
 * selectRecommendedScenario — implémente l'algorithme du §11 :
 * "minimiser le coût énergétique sous contrainte de temps". Parmi tous les scénarios dont la
 * durée ne dépasse pas (durée du scénario FAST + tolérance utilisateur), retourne celui de
 * coût le plus faible. En cas d'égalité de coût, retient la durée la plus courte.
 */
export function selectRecommendedScenario(
  trip: Trip,
  vehicle: VehicleProfile,
  preferences: UserPreferences,
  fast: ScenarioResult
): ScenarioResult {
  const candidates = buildSpeedCandidates(trip);
  const maxDurationMin = fast.durationMin + preferences.timeToleranceMin;

  const withinTolerance = candidates
    .map((candidate) => {
      const scenario: Scenario = { type: "RECOMMENDED", segmentTargetSpeedsKmh: candidate.segmentTargetSpeedsKmh };
      return evaluateScenario(trip, vehicle, scenario, { baseline: fast });
    })
    .filter((result) => result.durationMin <= maxDurationMin);

  const pool = withinTolerance.length > 0 ? withinTolerance : [fast];

  return pool.reduce((best, current) => {
    if (current.costEuros < best.costEuros) return current;
    if (current.costEuros === best.costEuros && current.durationMin < best.durationMin) return current;
    return best;
  });
}
