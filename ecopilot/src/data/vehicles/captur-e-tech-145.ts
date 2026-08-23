import type { VehicleProfile } from "../../types";

/**
 * Véhicule laboratoire initial (§6). Ces valeurs sont des données de calibration issues d'un
 * relevé réel, PAS des constantes universelles — elles vivent ici comme donnée, jamais en dur
 * dans le moteur (src/engine). La courbe vitesse/consommation ci-dessous reste
 * ESTIMATED_UNCALIBRATED tant qu'elle n'a pas été recalibrée à partir de plusieurs relevés
 * Test Lab à des vitesses différentes : le premier relevé terrain ne donne qu'une moyenne
 * globale (63,3 km/h), pas une courbe par vitesse.
 *
 * `consumptionProfiles` (courbes par contexte URBAN/ROAD/MOTORWAY) est volontairement absent :
 * aucune donnée de consommation spécifique à un contexte n'existe pour ce véhicule. Le moteur
 * retombe donc sur `defaultConsumptionCurve` pour les trois contextes tant qu'un vrai relevé
 * calibré par contexte n'est pas disponible (§2 audit — ne pas inventer de nouvelles données).
 */
export const capturETech145: VehicleProfile = {
  id: "captur-e-tech-145-2024",
  brand: "Renault",
  model: "Captur II Evolution",
  year: 2024,
  engine: "E-Tech full hybrid 145",
  energyType: "FULL_HYBRID",
  referenceFuelConsumptionPer100km: 5.5,
  referenceElectricConsumptionPer100km: 7.0,
  defaultConsumptionCurve: [
    { speedKmh: 30, litersPer100km: 4.2, electricKwhPer100km: 8.5, source: "ESTIMATED_UNCALIBRATED" },
    { speedKmh: 50, litersPer100km: 4.6, electricKwhPer100km: 7.5, source: "ESTIMATED_UNCALIBRATED" },
    { speedKmh: 70, litersPer100km: 5.0, electricKwhPer100km: 7.0, source: "ESTIMATED_UNCALIBRATED" },
    { speedKmh: 90, litersPer100km: 5.5, electricKwhPer100km: 6.8, source: "ESTIMATED_UNCALIBRATED" },
    { speedKmh: 110, litersPer100km: 6.3, electricKwhPer100km: 6.8, source: "ESTIMATED_UNCALIBRATED" },
    { speedKmh: 130, litersPer100km: 7.4, electricKwhPer100km: 6.8, source: "ESTIMATED_UNCALIBRATED" },
  ],
  calibrationDistanceKm: 1356.3,
  calibrationSampleCount: 1,
  // Valeur de départ ; recalculée par engine/confidence.ts à chaque chargement, pas figée ici.
  confidenceScore: 0,
  fuelPricePerLiter: 1.85,
  electricityPricePerKwh: 0.25,
  co2GramsPerLiterFuel: 2310,
  co2GramsPerKwhElectric: 60,
};

/**
 * Premier relevé terrain (§6), au format TestLabRecord partiel — à insérer via le Test Lab
 * plutôt que codé en dur une fois l'UI de saisie disponible.
 */
export const capturFirstFieldRecord = {
  distanceKm: 1356.3,
  electricDistanceKm: 473.3,
  actualFuelPer100km: 5.5,
  electricConsumptionPer100km: 7.0,
  averageSpeedKmh: 63.3,
  energyRecoveredKwh: 27.9,
};
