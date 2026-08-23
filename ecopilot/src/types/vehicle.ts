/**
 * Un point de la courbe consommation/vitesse d'un véhicule.
 * `source` distingue une valeur mesurée (calibrée) d'une valeur de départ non calibrée,
 * pour ne jamais présenter une estimation comme une mesure exacte (cf. cahier des charges §2.3).
 */
export type ConsumptionCurveSource = "ESTIMATED_UNCALIBRATED" | "CALIBRATED";

export interface ConsumptionCurvePoint {
  speedKmh: number;
  /** Litres / 100 km à cette vitesse, en roulage carburant thermique. */
  litersPer100km: number;
  /** kWh / 100 km à cette vitesse, en roulage électrique (0 pour un véhicule non hybride/électrique). */
  electricKwhPer100km: number;
  source: ConsumptionCurveSource;
}

/**
 * Contexte de conduite regroupant les types de route détaillés (RoadType) en trois familles
 * assez larges pour qu'une courbe de consommation dédiée ait un sens statistique. Voir
 * `engine/consumptionContext.ts` pour le mapping RoadType -> ConsumptionContext.
 */
export type ConsumptionContext = "URBAN" | "ROAD" | "MOTORWAY";

export type EnergyType = "PETROL" | "DIESEL" | "FULL_HYBRID" | "PLUGIN_HYBRID" | "ELECTRIC";

export interface VehicleProfile {
  id: string;
  brand: string;
  model: string;
  year: number;
  engine: string;
  energyType: EnergyType;
  /** Capacité de batterie en kWh, si applicable (hybride/électrique). */
  batteryCapacityKwh?: number;
  /** Consommation de référence constructeur ou observée, en L/100km (mixte). */
  referenceFuelConsumptionPer100km: number;
  /** Consommation électrique de référence, en kWh/100km, si applicable. */
  referenceElectricConsumptionPer100km?: number;
  /**
   * Courbe consommation/vitesse utilisée quand aucun profil spécifique à un contexte de
   * conduite (URBAN/ROAD/MOTORWAY) n'est disponible pour ce véhicule.
   */
  defaultConsumptionCurve: ConsumptionCurvePoint[];
  /**
   * Courbes de consommation propres à un contexte de conduite, quand elles ont été calibrées
   * pour ce véhicule. Optionnel et partiel par conception : tant qu'un contexte n'a pas de
   * courbe dédiée, le moteur retombe sur `defaultConsumptionCurve` plutôt que d'extrapoler ou
   * d'inventer des valeurs (voir `engine/consumptionContext.ts`).
   */
  consumptionProfiles?: Partial<Record<ConsumptionContext, ConsumptionCurvePoint[]>>;
  /** Kilomètres cumulés utilisés pour la calibration de ce profil. */
  calibrationDistanceKm: number;
  /** Nombre de TestLabRecord ayant contribué à la calibration. */
  calibrationSampleCount: number;
  /** Score de confiance global du profil, 0 à 1. Voir engine/confidence.ts. */
  confidenceScore: number;
  fuelPricePerLiter: number;
  /**
   * Prix de l'électricité au kWh. Utilisé pour le coût uniquement si l'électricité de ce
   * véhicule est une énergie achetée séparément (rechargeable / tout électrique) — voir
   * `engine/energySource.ts`. Sans objet pour un hybride non rechargeable.
   */
  electricityPricePerKwh: number;
  co2GramsPerLiterFuel: number;
  co2GramsPerKwhElectric: number;
}
