import type { CalibrationObservation } from "../../types";

/**
 * Premier relevé global du Captur (§15 mission calibration) : distance/consommation moyennes
 * observées sur une période couvrant des conditions et types de route mélangés. `observationScope`
 * = "GLOBAL_BASELINE" garantit qu'il n'alimentera JAMAIS un speedBucket (voir
 * classifyObservationForCalibration) — il sert uniquement de référence de cohérence globale une
 * fois qu'un modèle calibré par contexte/vitesse existera, pour vérifier qu'il produit des
 * résultats plausibles à grande échelle.
 *
 * `roadContext` est volontairement absent : ce relevé n'a pas de contexte routier unique honnête
 * à déclarer. `routeHomogeneity` est "MIXED" pour la même raison.
 *
 * Donnée exportée seulement — PAS insérée automatiquement dans calibrationObservationRepository.
 * À enregistrer explicitement si utile, ex. `calibrationObservationRepository.save(capturGlobalBaselineObservation)`.
 */
export const capturGlobalBaselineObservation: CalibrationObservation = {
  id: "captur-global-baseline-1",
  vehicleId: "captur-e-tech-145-2024",
  timestamp: "2026-01-01T00:00:00.000Z",
  distanceKm: 1356.3,
  durationMin: (1356.3 / 63.3) * 60,
  averageSpeedKmh: 63.3,
  observedFuelConsumptionLPer100km: 5.5,
  electricDistanceKm: 473.3,
  energyRecoveredKwh: 27.9,
  routeHomogeneity: "MIXED",
  observationScope: "GLOBAL_BASELINE",
  notes:
    "Relevé global constructeur/tableau de bord sur une période mêlant plusieurs types de route et conditions. Consommation électrique affichée : 7,0 kWh/100km.",
};
