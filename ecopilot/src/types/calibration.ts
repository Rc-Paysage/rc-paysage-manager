import type { ConsumptionContext } from "./vehicle";

/**
 * Trois états de données du Calibration Engine (§3 mission calibration) :
 *  - ESTIMATED_UNCALIBRATED (déjà défini dans vehicle.ts) : valeur provisoire faute de données.
 *  - OBSERVED : une CalibrationObservation individuelle — vraie pour CE trajet, jamais une
 *    calibration générale à elle seule.
 *  - CALIBRATED (déjà défini dans vehicle.ts) : dérivée de plusieurs observations cohérentes.
 * Ce fichier ne redéfinit donc que ce qui est propre au pipeline d'observation/calibration.
 */

export type RouteHomogeneity = "HOMOGENEOUS" | "MIXED" | "UNKNOWN";

/**
 * CANDIDATE : observation susceptible d'alimenter un speedBucket après classification.
 * GLOBAL_BASELINE : relevé agrégé sur une période/plusieurs contextes (ex. relevé constructeur
 * du tableau de bord) — sert de référence de cohérence globale, n'alimente JAMAIS un
 * speedBucket (§15 mission calibration).
 */
export type ObservationScope = "CANDIDATE" | "GLOBAL_BASELINE";

export type TrafficLevel = "LOW" | "MEDIUM" | "HIGH";

/**
 * Un relevé terrain individuel. Volontairement séparé de TestLabRecord (types/testlab.ts) :
 * TestLabRecord compare une prédiction EcoPilot à une réalité pour un trajet donné (boucle
 * d'apprentissage produit) ; CalibrationObservation alimente exclusivement le pipeline
 * statistique de calibration de la courbe consommation/vitesse. Les deux peuvent être créés à
 * partir de la même saisie Test Lab sans être couplés dans le code.
 */
export interface CalibrationObservation {
  id: string;
  vehicleId: string;
  timestamp: string;
  tripId?: string;

  distanceKm: number;
  durationMin: number;
  averageSpeedKmh: number;
  observedFuelConsumptionLPer100km: number;
  observedFuelLiters?: number;

  /**
   * Contexte principal déclaré pour ce trajet. Optionnel : un relevé GLOBAL_BASELINE couvrant
   * plusieurs contextes n'a pas de valeur honnête à indiquer ici (§15).
   */
  roadContext?: ConsumptionContext;

  /**
   * Vitesse cible/stabilisée si elle est connue — distincte de averageSpeedKmh (§7 mission
   * calibration : ne jamais confondre vitesse moyenne et vitesse stabilisée).
   */
  targetSpeedKmh?: number;
  speedLimitKmh?: number;

  /** Conservées comme métriques d'analyse hybride — jamais utilisées pour réduire la distance
   * carburant du calcul (§13 mission calibration, même erreur que §1 de l'audit précédent). */
  electricDistanceKm?: number;
  energyRecoveredKwh?: number;

  temperatureC?: number;
  elevationGainM?: number;
  trafficLevel?: TrafficLevel;
  weather?: string;
  notes?: string;

  /** Trajet homogène (un seul contexte dominant) vs trajet mixte vs inconnu. Voir §5, §7. */
  routeHomogeneity: RouteHomogeneity;

  /** Voir ObservationScope. Par défaut "CANDIDATE" pour tout relevé Test Lab normal. */
  observationScope: ObservationScope;
}

/** Une plage de vitesse représentative, configurable — jamais une vérité universelle (§6). */
export interface SpeedBucketDefinition {
  id: string;
  representativeSpeedKmh: number;
  minSpeedKmh: number;
  maxSpeedKmh: number;
}

export type RobustConsumptionMethod = "MEDIAN" | "TRIMMED_MEAN";

export interface ConsumptionDispersion {
  minLPer100km: number;
  maxLPer100km: number;
  /** Écart type classique — fourni à titre indicatif, sensible aux valeurs aberrantes. */
  stdDevLPer100km: number;
  /** MAD (Median Absolute Deviation) — mesure robuste utilisée pour la détection d'aberrations. */
  medianAbsoluteDeviation: number;
}

export type CalibrationReadinessLevel = "INSUFFICIENT_DATA" | "COLLECTING" | "CANDIDATE" | "CALIBRATED";

/**
 * Résultat du regroupement d'observations comparables (§8). Une seule observation ne peut
 * jamais, à elle seule, produire un groupe avec readiness CALIBRATED (voir readiness.ts).
 */
export interface CalibrationGroup {
  vehicleId: string;
  context: ConsumptionContext;
  speedBucket: SpeedBucketDefinition;
  observationCount: number;
  totalDistanceKm: number;
  meanConsumptionLPer100km: number;
  medianConsumptionLPer100km: number;
  robustConsumptionLPer100km: number;
  robustMethod: RobustConsumptionMethod;
  dispersion: ConsumptionDispersion;
  includedObservationIds: string[];
  excludedObservationIds: string[];
  /** id d'observation -> raison d'exclusion (ex. "STATISTICAL_OUTLIER_MAD"). */
  excludedObservationReasons: Record<string, string>;
  readiness: CalibrationReadinessLevel;
}

/**
 * Un CalibrationGroup identifié et horodaté, prêt à être inspecté/persisté. Produit par
 * buildCalibrationProposal() — jamais appliqué automatiquement à VehicleProfile (§12, §20).
 * applyCalibrationProposal() n'existe pas encore en V0 : cette séparation est volontaire.
 */
export interface CalibrationProposal extends CalibrationGroup {
  id: string;
  generatedAt: string;
}
