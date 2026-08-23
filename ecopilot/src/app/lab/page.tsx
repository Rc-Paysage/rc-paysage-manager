"use client";

import { useEffect, useState } from "react";
import type { TestLabRecord } from "../../types";
import { capturETech145 } from "../../data/vehicles/captur-e-tech-145";
import { vehicleRepository, testLabRepository } from "../../lib/repository";
import { createId } from "../../lib/id";
import { loadLastPrediction } from "../../lib/lastPrediction";
import { calculateConfidenceScore } from "../../engine/confidence";

interface FormState {
  distanceKm: string;
  durationMin: string;
  averageSpeedKmh: string;
  actualFuelPer100km: string;
  electricDistanceKm: string;
  energyRecoveredKwh: string;
  temperatureC: string;
  tripType: string;
  comment: string;
}

const EMPTY_FORM: FormState = {
  distanceKm: "",
  durationMin: "",
  averageSpeedKmh: "",
  actualFuelPer100km: "",
  electricDistanceKm: "",
  energyRecoveredKwh: "",
  temperatureC: "",
  tripType: "",
  comment: "",
};

export default function TestLabPage() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [records, setRecords] = useState<TestLabRecord[]>([]);

  useEffect(() => {
    setRecords(testLabRepository.getAll().sort((a, b) => (a.date < b.date ? 1 : -1)));
  }, []);

  function set<K extends keyof FormState>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const distanceKm = Number(form.distanceKm);
    const actualFuelPer100km = Number(form.actualFuelPer100km);
    if (!distanceKm || !actualFuelPer100km) return;

    const lastPrediction = loadLastPrediction();
    const predictedFuelPer100km = lastPrediction
      ? (lastPrediction.predictedFuelLiters / lastPrediction.distanceKm) * 100
      : undefined;

    const record: TestLabRecord = {
      id: createId("testlab"),
      vehicleId: capturETech145.id,
      tripId: lastPrediction?.tripId,
      date: new Date().toISOString(),
      distanceKm,
      durationMin: Number(form.durationMin) || 0,
      averageSpeedKmh: Number(form.averageSpeedKmh) || 0,
      actualFuelPer100km,
      electricDistanceKm: Number(form.electricDistanceKm) || 0,
      energyRecoveredKwh: Number(form.energyRecoveredKwh) || 0,
      temperatureC: form.temperatureC ? Number(form.temperatureC) : undefined,
      tripType: form.tripType || undefined,
      comment: form.comment || undefined,
      prediction:
        lastPrediction && predictedFuelPer100km !== undefined
          ? {
              fuelLiters: lastPrediction.predictedFuelLiters,
              electricEnergyKwh: lastPrediction.predictedElectricEnergyKwh,
              durationMin: lastPrediction.predictedDurationMin,
              confidenceScore: lastPrediction.confidenceScore,
            }
          : undefined,
      fuelPredictionErrorRatio:
        predictedFuelPer100km && predictedFuelPer100km > 0
          ? (actualFuelPer100km - predictedFuelPer100km) / predictedFuelPer100km
          : undefined,
    };

    testLabRepository.save(record);

    const vehicle = vehicleRepository.getById(capturETech145.id) ?? capturETech145;
    const updatedVehicle = {
      ...vehicle,
      calibrationDistanceKm: vehicle.calibrationDistanceKm + distanceKm,
      calibrationSampleCount: vehicle.calibrationSampleCount + 1,
    };
    updatedVehicle.confidenceScore = calculateConfidenceScore(updatedVehicle);
    vehicleRepository.save(updatedVehicle);

    setRecords(testLabRepository.getAll().sort((a, b) => (a.date < b.date ? 1 : -1)));
    setForm(EMPTY_FORM);
  }

  return (
    <>
      <section className="card">
        <h2>EcoPilot Test Lab</h2>
        <p style={{ fontSize: "0.85rem", color: "var(--color-muted)" }}>
          Enregistrez ce que vous avez réellement observé après un trajet pour affiner les
          prochaines prédictions.
        </p>
        <form onSubmit={handleSubmit}>
          <div className="field-row">
            <div>
              <label htmlFor="distanceKm">Distance (km)</label>
              <input id="distanceKm" type="number" value={form.distanceKm} onChange={(e) => set("distanceKm", e.target.value)} required />
            </div>
            <div>
              <label htmlFor="durationMin">Durée (min)</label>
              <input id="durationMin" type="number" value={form.durationMin} onChange={(e) => set("durationMin", e.target.value)} />
            </div>
          </div>
          <div className="field-row">
            <div>
              <label htmlFor="averageSpeedKmh">Vitesse moyenne (km/h)</label>
              <input id="averageSpeedKmh" type="number" value={form.averageSpeedKmh} onChange={(e) => set("averageSpeedKmh", e.target.value)} />
            </div>
            <div>
              <label htmlFor="actualFuelPer100km">Consommation réelle (L/100km)</label>
              <input
                id="actualFuelPer100km"
                type="number"
                step="0.1"
                value={form.actualFuelPer100km}
                onChange={(e) => set("actualFuelPer100km", e.target.value)}
                required
              />
            </div>
          </div>
          <div className="field-row">
            <div>
              <label htmlFor="electricDistanceKm">Distance électrique (km)</label>
              <input id="electricDistanceKm" type="number" value={form.electricDistanceKm} onChange={(e) => set("electricDistanceKm", e.target.value)} />
            </div>
            <div>
              <label htmlFor="energyRecoveredKwh">Énergie récupérée (kWh)</label>
              <input id="energyRecoveredKwh" type="number" value={form.energyRecoveredKwh} onChange={(e) => set("energyRecoveredKwh", e.target.value)} />
            </div>
          </div>
          <div className="field-row">
            <div>
              <label htmlFor="temperatureC">Température (°C)</label>
              <input id="temperatureC" type="number" value={form.temperatureC} onChange={(e) => set("temperatureC", e.target.value)} />
            </div>
            <div>
              <label htmlFor="tripType">Type de trajet</label>
              <input id="tripType" value={form.tripType} onChange={(e) => set("tripType", e.target.value)} placeholder="Autoroute, mixte..." />
            </div>
          </div>
          <label htmlFor="comment">Commentaire</label>
          <input id="comment" value={form.comment} onChange={(e) => set("comment", e.target.value)} />
          <button type="submit" className="primary">
            Enregistrer le relevé
          </button>
        </form>
      </section>

      <section className="card">
        <h2>Historique</h2>
        {records.length === 0 && <p style={{ color: "var(--color-muted)" }}>Aucun relevé pour l'instant.</p>}
        {records.map((record) => (
          <div className="history-item" key={record.id}>
            <div>{new Date(record.date).toLocaleDateString("fr-FR")} — {record.distanceKm} km</div>
            <div>Consommation réelle : {record.actualFuelPer100km.toFixed(1)} L/100km</div>
            {record.fuelPredictionErrorRatio !== undefined && (
              <div className={Math.abs(record.fuelPredictionErrorRatio) < 0.1 ? "error-good" : "error-bad"}>
                Erreur de prédiction : {(record.fuelPredictionErrorRatio * 100).toFixed(1)} %
              </div>
            )}
          </div>
        ))}
      </section>
    </>
  );
}
