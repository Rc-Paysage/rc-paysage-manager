import type { TimeAnchorStatus } from "../types";

export interface TimeAnchorResult {
  /** Délai fixe (minutes) à ajouter à toute durée théorique du trajet. Jamais négatif. */
  fixedDelayMin: number;
  status: TimeAnchorStatus;
}

/**
 * Calcule le délai fixe d'ancrage à partir de la durée théorique du scénario FAST et de la
 * référence GPS/manuelle du trajet — méthode ADDITIVE validée (pas de multiplicateur).
 *
 * fixedDelayMin = referenceDurationMin - theoreticalDurationMinFast, uniquement si la référence
 * est exploitable (positive et >= theoreticalDurationMinFast) ; sinon 0.
 *
 * Pourquoi additif et pas multiplicatif : un multiplicateur (referenceDurationMin /
 * theoreticalDurationMinFast) appliqué à tous les scénarios amplifie artificiellement l'écart
 * des scénarios plus lents — un embouteillage de 30 min sur FAST ne devient pas 45 min sur un
 * scénario ECO 25% plus lent en théorie. Un délai fixe, lui, représente un temps incompressible
 * (bouchons, accès, feux) qui s'ajoute identiquement à toutes les stratégies du même trajet.
 */
export function calculateTimeAnchor(
  theoreticalDurationMinFast: number,
  referenceDurationMin: number
): TimeAnchorResult {
  const hasUsableReference = referenceDurationMin > 0;

  if (!hasUsableReference) {
    return { fixedDelayMin: 0, status: "NO_REFERENCE" };
  }

  if (referenceDurationMin < theoreticalDurationMinFast) {
    return { fixedDelayMin: 0, status: "REFERENCE_BELOW_THEORETICAL" };
  }

  return { fixedDelayMin: referenceDurationMin - theoreticalDurationMinFast, status: "APPLIED" };
}

/** Applique le délai fixe d'ancrage à la durée théorique d'un scénario donné. */
export function anchorScenarioDuration(theoreticalDurationMin: number, fixedDelayMin: number): number {
  return theoreticalDurationMin + fixedDelayMin;
}
