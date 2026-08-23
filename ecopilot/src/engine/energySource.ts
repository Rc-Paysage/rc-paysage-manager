import type { VehicleProfile } from "../types";

/**
 * Un hybride "full hybrid" non rechargeable ne consomme jamais d'électricité achetée
 * séparément : son énergie électrique provient exclusivement du carburant (recharge par le
 * moteur thermique) ou de la récupération au freinage — cette énergie est déjà comptée dans le
 * carburant consommé. Ne compter le kWh électrique comme énergie externe (coût, CO2) que pour
 * un hybride rechargeable ou un véhicule tout électrique, qui se rechargent réellement au
 * réseau (§3 audit).
 */
export function isElectricityExternalEnergy(vehicle: Pick<VehicleProfile, "energyType">): boolean {
  return vehicle.energyType === "PLUGIN_HYBRID" || vehicle.energyType === "ELECTRIC";
}
