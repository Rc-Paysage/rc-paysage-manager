import type { CalibrationGroup, CalibrationObservation, SpeedBucketDefinition } from "../../types";
import { classifyObservationForCalibration } from "./classification";
import { DEFAULT_SPEED_BUCKETS } from "./speedBuckets";
import {
  calculateDispersion,
  arithmeticMean,
  median,
  calculateRobustConsumption,
  detectCalibrationOutliers,
  type RobustConsumptionConfig,
  type OutlierDetectionConfig,
  DEFAULT_ROBUST_CONSUMPTION_CONFIG,
  DEFAULT_OUTLIER_DETECTION_CONFIG,
} from "./statistics";
import { calculateCalibrationReadiness, DEFAULT_CALIBRATION_READINESS_THRESHOLDS, type CalibrationReadinessThresholds } from "./readiness";

export interface SkippedObservation {
  observationId: string;
  reason: string;
}

export interface GroupComparableObservationsResult {
  groups: CalibrationGroup[];
  /** Observations non retenues pour un regroupement, avec la raison (voir classification.ts). */
  skipped: SkippedObservation[];
}

export interface GroupComparableObservationsOptions {
  speedBuckets?: SpeedBucketDefinition[];
  outlierConfig?: OutlierDetectionConfig;
  robustConfig?: RobustConsumptionConfig;
  readinessThresholds?: CalibrationReadinessThresholds;
}

/**
 * Implémente §6 à §11 de la mission calibration : classe chaque observation, regroupe les
 * observations comparables (même véhicule, même contexte, même speedBucket), détecte les
 * aberrations par groupe, calcule une valeur centrale robuste et évalue la readiness. Aucune
 * observation n'est jamais supprimée ; les exclusions sont uniquement reflétées dans
 * `excludedObservationIds`/`excludedObservationReasons` du groupe concerné.
 */
export function groupComparableObservations(
  observations: CalibrationObservation[],
  options: GroupComparableObservationsOptions = {}
): GroupComparableObservationsResult {
  const speedBuckets = options.speedBuckets ?? DEFAULT_SPEED_BUCKETS;

  const skipped: SkippedObservation[] = [];
  const pools = new Map<string, CalibrationObservation[]>();
  const poolMeta = new Map<string, { vehicleId: string; context: CalibrationGroup["context"]; speedBucket: SpeedBucketDefinition }>();

  for (const observation of observations) {
    const classification = classifyObservationForCalibration(observation, speedBuckets);
    if (!classification.usable) {
      skipped.push({ observationId: observation.id, reason: classification.reason });
      continue;
    }

    const key = `${observation.vehicleId}|${classification.roadContext}|${classification.speedBucket.id}`;
    const pool = pools.get(key) ?? [];
    pool.push(observation);
    pools.set(key, pool);
    poolMeta.set(key, {
      vehicleId: observation.vehicleId,
      context: classification.roadContext,
      speedBucket: classification.speedBucket,
    });
  }

  const groups: CalibrationGroup[] = [];

  for (const [key, pool] of pools) {
    const meta = poolMeta.get(key)!;

    const outlierResult = detectCalibrationOutliers(
      pool.map((o) => ({ id: o.id, value: o.observedFuelConsumptionLPer100km })),
      options.outlierConfig ?? DEFAULT_OUTLIER_DETECTION_CONFIG
    );
    const excludedIds = new Set(outlierResult.outlierIds);
    const includedObservations = pool.filter((o) => !excludedIds.has(o.id));
    const includedValues = includedObservations.map((o) => o.observedFuelConsumptionLPer100km);

    const robust = calculateRobustConsumption(includedValues, options.robustConfig ?? DEFAULT_ROBUST_CONSUMPTION_CONFIG);
    const dispersion = calculateDispersion(includedValues);
    const totalDistanceKm = includedObservations.reduce((sum, o) => sum + o.distanceKm, 0);
    const medianConsumption = median(includedValues);

    const readiness = calculateCalibrationReadiness(
      {
        observationCount: includedObservations.length,
        totalDistanceKm,
        dispersionRatio: medianConsumption > 0 ? dispersion.medianAbsoluteDeviation / medianConsumption : 0,
        excludedRatio: excludedIds.size / pool.length,
      },
      options.readinessThresholds ?? DEFAULT_CALIBRATION_READINESS_THRESHOLDS
    );

    groups.push({
      vehicleId: meta.vehicleId,
      context: meta.context,
      speedBucket: meta.speedBucket,
      observationCount: includedObservations.length,
      totalDistanceKm,
      meanConsumptionLPer100km: arithmeticMean(includedValues),
      medianConsumptionLPer100km: medianConsumption,
      robustConsumptionLPer100km: robust.value,
      robustMethod: robust.method,
      dispersion,
      includedObservationIds: includedObservations.map((o) => o.id),
      excludedObservationIds: outlierResult.outlierIds,
      excludedObservationReasons: Object.fromEntries(
        outlierResult.outlierIds.map((id) => [id, "STATISTICAL_OUTLIER_MAD"])
      ),
      readiness,
    });
  }

  return { groups, skipped };
}
