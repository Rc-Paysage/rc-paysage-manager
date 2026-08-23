export interface TestLabPrediction {
  fuelLiters: number;
  electricEnergyKwh: number;
  durationMin: number;
  confidenceScore: number;
}

export interface TestLabRecord {
  id: string;
  vehicleId: string;
  tripId?: string;
  date: string;
  distanceKm: number;
  durationMin: number;
  averageSpeedKmh: number;
  /** Consommation carburant réellement observée, en L/100km. */
  actualFuelPer100km: number;
  electricDistanceKm: number;
  energyRecoveredKwh: number;
  temperatureC?: number;
  tripType?: string;
  comment?: string;
  /** Prédiction EcoPilot enregistrée avant le trajet, pour comparaison. */
  prediction?: TestLabPrediction;
  /** Erreur relative (réel - prédit) / prédit, calculée une fois le relevé saisi. */
  fuelPredictionErrorRatio?: number;
}
