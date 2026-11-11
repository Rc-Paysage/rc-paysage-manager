import type { ScenarioResult, Trip, VehicleProfile } from "../types";
import { DEFAULT_USER_PREFERENCES } from "../types";
import { capturETech145 } from "../data/vehicles/captur-e-tech-145";
import { vehicleRepository, tripRepository } from "./repository";
import { saveLastPrediction } from "./lastPrediction";
import { saveLastRecommendation } from "./lastRecommendation";
import { generateScenarios } from "../engine/generateScenarios";
import { selectRecommendedScenario } from "../engine/recommendation";
import { calculateConfidenceScore } from "../engine/confidence";

export interface PlannedScenarios {
  fast: ScenarioResult;
  balanced: ScenarioResult;
  eco: ScenarioResult;
  recommended: ScenarioResult;
}

/**
 * Enchaîne le moteur pour un trajet et persiste ce dont les autres écrans ont besoin
 * (profil véhicule, trajet, dernière prédiction pour le Test Lab, dernière recommandation pour
 * le mode Conduite). Partagé par le mode simple (/) et le mode avancé (/avance).
 */
export function planTrip(trip: Trip, toleranceMin: number, fuelPricePerLiter?: number): PlannedScenarios {
  const stored = vehicleRepository.getById(capturETech145.id) ?? capturETech145;
  const vehicle: VehicleProfile = {
    ...stored,
    fuelPricePerLiter: fuelPricePerLiter ?? stored.fuelPricePerLiter,
  };
  vehicle.confidenceScore = calculateConfidenceScore(vehicle);
  vehicleRepository.save(vehicle);
  tripRepository.save(trip);

  const { fast, balanced, eco } = generateScenarios(trip, vehicle);
  const preferences = { ...DEFAULT_USER_PREFERENCES, timeToleranceMin: toleranceMin };
  const recommended = selectRecommendedScenario(trip, vehicle, preferences, fast);

  saveLastPrediction({
    vehicleId: vehicle.id,
    tripId: trip.id,
    distanceKm: trip.distanceKm,
    predictedDurationMin: recommended.theoreticalDurationMin,
    predictedFuelLiters: recommended.fuelLiters,
    predictedElectricEnergyKwh: recommended.electricEnergyKwh,
    confidenceScore: recommended.confidenceScore,
    savedAt: new Date().toISOString(),
  });

  const targetSpeedsByRoadType: Record<string, number> = {};
  trip.segments.forEach((segment, index) => {
    targetSpeedsByRoadType[segment.roadType] = recommended.scenario.segmentTargetSpeedsKmh[index];
  });

  saveLastRecommendation({
    destination: trip.destination,
    distanceKm: trip.distanceKm,
    targetSpeedsByRoadType,
    anchoredDurationMin: recommended.anchoredDurationMin,
    extraTimeMin: recommended.extraTimeMin,
    savingsEuros: recommended.savingsEuros,
    fuelSavedLiters: fast.fuelLiters - recommended.fuelLiters,
    co2AvoidedGrams: recommended.co2AvoidedGrams,
    timeAnchorStatus: recommended.timeAnchorStatus,
    savedAt: new Date().toISOString(),
  });

  return { fast, balanced, eco, recommended };
}
