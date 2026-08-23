import type { ConsumptionContext, ConsumptionCurvePoint, RoadType, VehicleProfile } from "../types";

/**
 * Regroupe les types de voie détaillés (RouteSegment.roadType) en trois contextes de
 * consommation plus larges. Seul endroit à modifier si ce regroupement doit évoluer.
 */
export const ROAD_TYPE_TO_CONSUMPTION_CONTEXT: Record<RoadType, ConsumptionContext> = {
  URBAN: "URBAN",
  RURAL: "ROAD",
  MAIN_ROAD: "ROAD",
  EXPRESSWAY: "MOTORWAY",
  HIGHWAY: "MOTORWAY",
};

export function roadTypeToConsumptionContext(roadType: RoadType): ConsumptionContext {
  return ROAD_TYPE_TO_CONSUMPTION_CONTEXT[roadType];
}

/**
 * Retourne la courbe de consommation à utiliser pour ce contexte : la courbe spécifique du
 * véhicule si elle a été calibrée pour ce contexte, sinon `defaultConsumptionCurve`. Ne fabrique
 * jamais de courbe par extrapolation — un contexte non calibré retombe explicitement sur la
 * courbe par défaut plutôt que d'inventer des points intermédiaires (§2 audit : préparer
 * l'architecture sans inventer de nouvelles données de consommation).
 */
export function resolveConsumptionCurve(
  vehicle: Pick<VehicleProfile, "defaultConsumptionCurve" | "consumptionProfiles">,
  context: ConsumptionContext
): ConsumptionCurvePoint[] {
  return vehicle.consumptionProfiles?.[context] ?? vehicle.defaultConsumptionCurve;
}
