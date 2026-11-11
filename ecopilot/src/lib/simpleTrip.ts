import type { RouteSegment, Trip } from "../types";
import { createId } from "./id";

/**
 * Types de trajet proposés en mode simple. Chaque préréglage découpe la distance en segments
 * typiques — des HYPOTHÈSES de répartition et de limitations, pas des mesures. Le mode avancé
 * (/avance) permet toujours de saisir les segments réels à la main.
 */
export type SimpleTripKind = "MOTORWAY" | "ROAD" | "URBAN" | "MIXED";

export const SIMPLE_TRIP_KINDS: { value: SimpleTripKind; label: string }[] = [
  { value: "MOTORWAY", label: "Autoroute" },
  { value: "ROAD", label: "Route" },
  { value: "URBAN", label: "Ville" },
  { value: "MIXED", label: "Mixte" },
];

interface SegmentPreset {
  share: number;
  roadType: RouteSegment["roadType"];
  speedLimitKmh: number;
}

const PRESETS: Record<SimpleTripKind, SegmentPreset[]> = {
  MOTORWAY: [{ share: 1, roadType: "HIGHWAY", speedLimitKmh: 130 }],
  ROAD: [{ share: 1, roadType: "MAIN_ROAD", speedLimitKmh: 80 }],
  URBAN: [{ share: 1, roadType: "URBAN", speedLimitKmh: 50 }],
  // Répartition indicative : 20 % ville, 30 % route, 50 % autoroute.
  MIXED: [
    { share: 0.2, roadType: "URBAN", speedLimitKmh: 50 },
    { share: 0.3, roadType: "MAIN_ROAD", speedLimitKmh: 80 },
    { share: 0.5, roadType: "HIGHWAY", speedLimitKmh: 130 },
  ],
};

export interface SimpleTripInput {
  distanceKm: number;
  kind: SimpleTripKind;
  destination?: string;
  /**
   * Durée annoncée par Waze/GPS, en minutes, si l'utilisateur l'a sous les yeux. Alimente
   * directement Trip.referenceDurationMin et donc l'ancrage temporel (engine/timeAnchor.ts).
   * Absente -> 0 -> statut NO_REFERENCE, aucune durée GPS inventée.
   */
  gpsDurationMin?: number;
}

export function buildSimpleTrip(input: SimpleTripInput): Trip {
  const segments: RouteSegment[] = PRESETS[input.kind].map((preset, index) => ({
    id: `${input.kind.toLowerCase()}-${index}`,
    distanceKm: Math.round(input.distanceKm * preset.share * 10) / 10,
    roadType: preset.roadType,
    speedLimitKmh: preset.speedLimitKmh,
  }));

  return {
    id: createId("trip"),
    origin: "Départ",
    destination: input.destination?.trim() || "Arrivée",
    distanceKm: input.distanceKm,
    referenceDurationMin: input.gpsDurationMin && input.gpsDurationMin > 0 ? input.gpsDurationMin : 0,
    segments,
    date: new Date().toISOString(),
  };
}

/** Lien universel Waze (documenté par Waze) : ouvre l'app avec la destination et lance la navigation. */
export function buildWazeUrl(destination: string): string {
  return `https://waze.com/ul?q=${encodeURIComponent(destination)}&navigate=yes`;
}
