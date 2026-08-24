import type { CalibrationObservation, CalibrationProposal, TestLabRecord, Trip, VehicleProfile } from "../types";

/**
 * Interface de persistance générique. La V0 utilise localStorage (LocalStorageRepository) ;
 * une implémentation base de données pourra la remplacer plus tard sans toucher au moteur
 * ni aux composants qui dépendent de cette interface (§3 : la persistance est une couche isolée).
 */
export interface Repository<T extends { id: string }> {
  getAll(): T[];
  getById(id: string): T | undefined;
  save(item: T): void;
  remove(id: string): void;
}

export class LocalStorageRepository<T extends { id: string }> implements Repository<T> {
  constructor(private readonly storageKey: string) {}

  getAll(): T[] {
    if (typeof window === "undefined") return [];
    const raw = window.localStorage.getItem(this.storageKey);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as T[];
    } catch {
      return [];
    }
  }

  getById(id: string): T | undefined {
    return this.getAll().find((item) => item.id === id);
  }

  save(item: T): void {
    if (typeof window === "undefined") return;
    const items = this.getAll();
    const index = items.findIndex((existing) => existing.id === item.id);
    if (index >= 0) {
      items[index] = item;
    } else {
      items.push(item);
    }
    window.localStorage.setItem(this.storageKey, JSON.stringify(items));
  }

  remove(id: string): void {
    if (typeof window === "undefined") return;
    const items = this.getAll().filter((item) => item.id !== id);
    window.localStorage.setItem(this.storageKey, JSON.stringify(items));
  }
}

export const vehicleRepository = new LocalStorageRepository<VehicleProfile>("ecopilot.vehicles");
export const tripRepository = new LocalStorageRepository<Trip>("ecopilot.trips");
export const testLabRepository = new LocalStorageRepository<TestLabRecord>("ecopilot.testlab");

/**
 * Persistance du Calibration Engine (§17 mission calibration) : observations et propositions
 * stockées séparément, via la même abstraction Repository — le moteur de calibration ne connaît
 * pas localStorage, il reçoit/retourne des données pures (voir engine/calibration/).
 */
export const calibrationObservationRepository = new LocalStorageRepository<CalibrationObservation>(
  "ecopilot.calibrationObservations"
);
export const calibrationProposalRepository = new LocalStorageRepository<CalibrationProposal>(
  "ecopilot.calibrationProposals"
);
