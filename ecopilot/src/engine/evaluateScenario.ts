import type { Scenario, ScenarioResult, Trip, VehicleProfile } from "../types";
import { estimateConsumption } from "./estimateConsumption";
import { calculateConfidenceScore, type ConfidenceInputs } from "./confidence";
import { calculateUncertaintyRange, type UncertaintyInputs } from "./uncertainty";
import { isElectricityExternalEnergy } from "./energySource";
import { clampToSafeSpeed, DEFAULT_SPEED_CONSTRAINTS, type SpeedConstraintTable } from "./speedConstraints";

export interface EvaluateScenarioOptions {
  /** Résultat du scénario FAST, pour calculer extraTimeMin/savingsEuros/co2AvoidedGrams. */
  baseline?: ScenarioResult;
  /** Contraintes de vitesse par type de voie ; par défaut DEFAULT_SPEED_CONSTRAINTS. */
  speedConstraints?: SpeedConstraintTable;
  /** Données de calibration récentes (Test Lab), pour affiner confiance et incertitude. */
  calibration?: ConfidenceInputs & UncertaintyInputs;
}

/**
 * Fonction centrale du moteur : calcule durée, consommation, coût et CO2 d'un scénario complet.
 *
 * Sécurité avant économie (§2.1) : chaque vitesse cible demandée par le scénario est ramenée
 * dans la plage sûre et légale du segment via `clampToSafeSpeed` avant tout calcul — jamais
 * au-dessus de la limitation légale, jamais en dessous du plancher opérationnel du type de voie
 * (voir speedConstraints.ts — un plancher produit/sécurité configurable, PAS une règle légale).
 *
 * Comptabilité énergétique (§3 audit initial / §1 audit correctif) : le kWh électrique n'est
 * ajouté au coût et au CO2 que si `isElectricityExternalEnergy(vehicle)` — uniquement pour un
 * hybride rechargeable ou un véhicule tout électrique. Pour un hybride non rechargeable,
 * `fuelLiters` porte déjà sur la distance ENTIÈRE du segment (la courbe de consommation
 * représente la consommation globale du véhicule) ; `electricEnergyKwh`/`electricDistanceKm`
 * restent dans le résultat comme métriques analytiques/de calibration uniquement, jamais
 * soustraites du carburant.
 *
 * `theoreticalDurationMin` (§3 audit correctif) : durée issue du seul modèle distance/vitesse,
 * PAS une estimation réaliste de navigation — voir `Trip.referenceDurationMin` pour la durée de
 * référence GPS/saisie manuelle. Aucun ancrage sur `referenceDurationMin` n'est encore
 * implémenté en V0 (proposition en attente de validation) ; `extraTimeMin`/`savingsEuros`
 * restent donc calculés à partir de `theoreticalDurationMin` pour l'instant.
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

  const speedConstraints = options.speedConstraints ?? DEFAULT_SPEED_CONSTRAINTS;

  let theoreticalDurationMin = 0;
  let fuelLiters = 0;
  let electricEnergyKwh = 0;
  let electricDistanceKm = 0;
  let anyUncalibrated = false;

  trip.segments.forEach((segment, index) => {
    const requestedSpeedKmh = scenario.segmentTargetSpeedsKmh[index];
    const safeSpeedKmh = clampToSafeSpeed(
      segment.roadType,
      segment.speedLimitKmh,
      requestedSpeedKmh,
      speedConstraints
    );

    const result = estimateConsumption(segment, safeSpeedKmh, vehicle);
    theoreticalDurationMin += result.durationMin;
    fuelLiters += result.fuelLiters;
    electricEnergyKwh += result.electricEnergyKwh;
    electricDistanceKm += result.electricDistanceKm;
    anyUncalibrated = anyUncalibrated || result.isUncalibrated;
  });

  const electricIsExternalEnergy = isElectricityExternalEnergy(vehicle);
  const costEuros =
    fuelLiters * vehicle.fuelPricePerLiter +
    (electricIsExternalEnergy ? electricEnergyKwh * vehicle.electricityPricePerKwh : 0);
  const co2Grams =
    fuelLiters * vehicle.co2GramsPerLiterFuel +
    (electricIsExternalEnergy ? electricEnergyKwh * vehicle.co2GramsPerKwhElectric : 0);

  const extraTimeMin = options.baseline
    ? theoreticalDurationMin - options.baseline.theoreticalDurationMin
    : 0;
  const savingsEuros = options.baseline ? options.baseline.costEuros - costEuros : 0;
  const co2AvoidedGrams = options.baseline ? options.baseline.co2Grams - co2Grams : 0;

  const confidenceScore = calculateConfidenceScore(vehicle, options.calibration) * (anyUncalibrated ? 0.85 : 1);
  const uncertaintyRange = calculateUncertaintyRange(costEuros, options.calibration);

  return {
    scenario,
    theoreticalDurationMin,
    extraTimeMin,
    fuelLiters,
    electricEnergyKwh,
    electricDistanceKm,
    costEuros,
    savingsEuros,
    co2Grams,
    co2AvoidedGrams,
    confidenceScore,
    uncertaintyRange,
  };
}
