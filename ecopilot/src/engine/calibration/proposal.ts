import type { CalibrationGroup, CalibrationObservation, CalibrationProposal } from "../../types";
import { createId } from "../../lib/id";
import { groupComparableObservations, type GroupComparableObservationsOptions } from "./grouping";

/**
 * Enveloppe un CalibrationGroup en CalibrationProposal identifiée/horodatée, prête à être
 * inspectée ou persistée. Ne modifie JAMAIS VehicleProfile.consumptionProfiles (§12, §20 mission
 * calibration) — une éventuelle applyCalibrationProposal() qui écrirait dans le profil véhicule
 * n'existe pas encore en V0, volontairement : la première calibration réelle sera validée
 * manuellement.
 */
export function buildCalibrationProposal(group: CalibrationGroup): CalibrationProposal {
  return {
    ...group,
    id: createId("calib-proposal"),
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Point d'entrée du pipeline complet (§1 mission calibration) : classification + regroupement
 * + statistiques + readiness, puis mise en forme en propositions identifiées. Une proposition
 * par (véhicule, contexte, speedBucket) ayant reçu au moins une observation utilisable.
 */
export function calculateCalibrationProposals(
  observations: CalibrationObservation[],
  options: GroupComparableObservationsOptions = {}
): CalibrationProposal[] {
  const { groups } = groupComparableObservations(observations, options);
  return groups.map(buildCalibrationProposal);
}
