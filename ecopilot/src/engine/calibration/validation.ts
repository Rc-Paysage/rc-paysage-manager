import type { CalibrationObservation } from "../../types";

/**
 * Bornes de plausibilité pour détecter des erreurs de saisie — PAS des lois physiques.
 * HEURISTIQUE V0, configurable, à ajuster avec l'expérience terrain.
 */
export interface ValidationConfig {
  minPlausibleFuelConsumptionLPer100km: number;
  maxPlausibleFuelConsumptionLPer100km: number;
  maxPlausibleAverageSpeedKmh: number;
}

export const DEFAULT_VALIDATION_CONFIG: ValidationConfig = {
  minPlausibleFuelConsumptionLPer100km: 1,
  maxPlausibleFuelConsumptionLPer100km: 30,
  maxPlausibleAverageSpeedKmh: 180,
};

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Valide la cohérence structurelle d'une observation AVANT toute classification/regroupement
 * (première étape du pipeline, §1 mission calibration). Ne juge jamais si l'observation est
 * utilisable pour calibrer un point précis — c'est le rôle de classifyObservationForCalibration.
 */
export function validateCalibrationObservation(
  observation: CalibrationObservation,
  config: ValidationConfig = DEFAULT_VALIDATION_CONFIG
): ValidationResult {
  const errors: string[] = [];

  if (!(observation.distanceKm > 0)) {
    errors.push("distanceKm doit être strictement positif.");
  }
  if (!(observation.durationMin > 0)) {
    errors.push("durationMin doit être strictement positif.");
  }
  if (!(observation.averageSpeedKmh > 0)) {
    errors.push("averageSpeedKmh doit être strictement positif.");
  } else if (observation.averageSpeedKmh > config.maxPlausibleAverageSpeedKmh) {
    errors.push(`averageSpeedKmh dépasse la plage plausible (> ${config.maxPlausibleAverageSpeedKmh} km/h).`);
  }

  const consumption = observation.observedFuelConsumptionLPer100km;
  if (!(consumption > 0)) {
    errors.push("observedFuelConsumptionLPer100km doit être strictement positif.");
  } else if (
    consumption < config.minPlausibleFuelConsumptionLPer100km ||
    consumption > config.maxPlausibleFuelConsumptionLPer100km
  ) {
    errors.push(
      `observedFuelConsumptionLPer100km hors plage plausible (${config.minPlausibleFuelConsumptionLPer100km}-${config.maxPlausibleFuelConsumptionLPer100km} L/100km).`
    );
  }

  if (observation.electricDistanceKm !== undefined && observation.electricDistanceKm > observation.distanceKm) {
    errors.push("electricDistanceKm ne peut pas dépasser distanceKm.");
  }

  return { valid: errors.length === 0, errors };
}
