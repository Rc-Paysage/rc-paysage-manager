import type { Scenario, ScenarioResult, Trip, VehicleProfile } from "../types";
import { estimateConsumption } from "./estimateConsumption";
import { calculateConfidenceScore } from "./confidence";
import { MIN_SEGMENT_SPEED_KMH } from "./constants";

export interface EvaluateScenarioOptions {
  /** Résultat du scénario FAST, pour calculer extraTimeMin/savingsEuros/co2AvoidedGrams. */
  baseline?: ScenarioResult;
}

/**
 * Fonction centrale du moteur : calcule durée, consommation, coût et CO2 d'un scénario complet.
 * Ne suppose jamais que la vitesse cible dépasse la limitation légale (§2.1 sécurité) :
 * les vitesses candidates sont bornées en amont par generateScenarios/recommendation.
 */
export function evaluateScenario(
  trip: Trip,
  vehicle: VehicleProfile,
  scenario: Scenario,
  options: EvaluateScenarioOptions = {}
): ScenarioResult {
  if (scenario.segmentTargetSpeedsKmh.length !== trip.segments.length) {
    throw new Error("Le scénario doit fournir une vitesse cible par segment du trajet.");
  }

  let durationMin = 0;
  let fuelLiters = 0;
  let electricEnergyKwh = 0;
  let electricDistanceKm = 0;
  let energyRecoveredKwh = 0;
  let anyUncalibrated = false;

  trip.segments.forEach((segment, index) => {
    const requestedSpeed = scenario.segmentTargetSpeedsKmh[index];
    const targetSpeedKmh = Math.min(
      segment.speedLimitKmh,
      Math.max(MIN_SEGMENT_SPEED_KMH, requestedSpeed)
    );

    const evaluatedSegment = {
      ...segment,
      targetSpeedKmh,
      estimatedAverageSpeedKmh: targetSpeedKmh,
    };

    const result = estimateConsumption(evaluatedSegment, vehicle);
    durationMin += result.durationMin;
    fuelLiters += result.fuelLiters;
    electricEnergyKwh += result.electricEnergyKwh;
    electricDistanceKm += result.electricDistanceKm;
    energyRecoveredKwh += result.energyRecoveredKwh;
    anyUncalibrated = anyUncalibrated || result.isUncalibrated;
  });

  const costEuros =
    fuelLiters * vehicle.fuelPricePerLiter + electricEnergyKwh * vehicle.electricityPricePerKwh;
  const co2Grams =
    fuelLiters * vehicle.co2GramsPerLiterFuel + electricEnergyKwh * vehicle.co2GramsPerKwhElectric;

  const extraTimeMin = options.baseline ? durationMin - options.baseline.durationMin : 0;
  const savingsEuros = options.baseline ? options.baseline.costEuros - costEuros : 0;
  const co2AvoidedGrams = options.baseline ? options.baseline.co2Grams - co2Grams : 0;

  const confidenceScore = calculateConfidenceScore(vehicle) * (anyUncalibrated ? 0.85 : 1);

  return {
    scenario,
    durationMin,
    extraTimeMin,
    fuelLiters,
    electricEnergyKwh,
    electricDistanceKm,
    energyRecoveredKwh,
    costEuros,
    savingsEuros,
    co2Grams,
    co2AvoidedGrams,
    confidenceScore,
  };
}
