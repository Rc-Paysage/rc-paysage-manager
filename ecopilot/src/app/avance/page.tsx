"use client";

import { useEffect, useState } from "react";
import type { RoadType, RouteSegment, ScenarioResult, Trip } from "../../types";
import { DEFAULT_USER_PREFERENCES } from "../../types";
import { capturETech145 } from "../../data/vehicles/captur-e-tech-145";
import { vehicleRepository } from "../../lib/repository";
import { createId } from "../../lib/id";
import { planTrip } from "../../lib/planTrip";
import { ScenarioCard } from "../../components/ScenarioCard";

const ROAD_TYPES: { value: RoadType; label: string }[] = [
  { value: "HIGHWAY", label: "Autoroute" },
  { value: "EXPRESSWAY", label: "Voie rapide" },
  { value: "MAIN_ROAD", label: "Route principale" },
  { value: "RURAL", label: "Route secondaire" },
  { value: "URBAN", label: "Ville" },
];

const TOLERANCE_OPTIONS_MIN = [0, 5, 10, 15, 30];

function newSegment(): RouteSegment {
  return {
    id: createId("seg"),
    distanceKm: 50,
    roadType: "HIGHWAY",
    speedLimitKmh: 130,
  };
}

export default function AdvancedTripPage() {
  const [fuelPrice, setFuelPrice] = useState(capturETech145.fuelPricePerLiter);
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [gpsDurationMin, setGpsDurationMin] = useState("");
  const [segments, setSegments] = useState<RouteSegment[]>([newSegment()]);
  const [toleranceMin, setToleranceMin] = useState(DEFAULT_USER_PREFERENCES.timeToleranceMin);
  const [scenarios, setScenarios] = useState<{
    fast: ScenarioResult;
    balanced: ScenarioResult;
    eco: ScenarioResult;
    recommended: ScenarioResult;
  } | null>(null);

  useEffect(() => {
    const existing = vehicleRepository.getById(capturETech145.id);
    if (existing) {
      setFuelPrice(existing.fuelPricePerLiter);
    } else {
      vehicleRepository.save(capturETech145);
    }
  }, []);

  function updateSegment(id: string, patch: Partial<RouteSegment>) {
    setSegments((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  function removeSegment(id: string) {
    setSegments((prev) => (prev.length > 1 ? prev.filter((s) => s.id !== id) : prev));
  }

  function handleGenerate() {
    const distanceKm = segments.reduce((sum, s) => sum + s.distanceKm, 0);

    const trip: Trip = {
      id: createId("trip"),
      origin: origin || "Départ",
      destination: destination || "Arrivée",
      distanceKm,
      // Mode avancé : saisir ici la durée GPS si elle est connue, sinon 0 = pas d'ancrage.
      referenceDurationMin: gpsDurationMin ? Number(gpsDurationMin) : 0,
      segments,
      date: new Date().toISOString(),
    };

    setScenarios(planTrip(trip, toleranceMin, fuelPrice));
  }

  return (
    <>
      <section className="card">
        <h2>Trajet</h2>
        <div className="field-row">
          <div>
            <label htmlFor="origin">Départ</label>
            <input id="origin" value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="Ville A" />
          </div>
          <div>
            <label htmlFor="destination">Destination</label>
            <input
              id="destination"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Ville B"
            />
          </div>
        </div>

        <label htmlFor="gpsDurationMin">Durée annoncée par Waze/GPS (min, facultatif)</label>
        <input
          id="gpsDurationMin"
          type="number"
          value={gpsDurationMin}
          onChange={(e) => setGpsDurationMin(e.target.value)}
        />

        <label htmlFor="fuel-price">Prix du carburant (€/L)</label>
        <input
          id="fuel-price"
          type="number"
          step="0.01"
          value={fuelPrice}
          onChange={(e) => setFuelPrice(Number(e.target.value))}
        />
      </section>

      <section className="card">
        <h2>Segments</h2>
        {segments.map((segment, index) => (
          <div className="segment-row" key={segment.id}>
            <div>
              <label>Distance (km)</label>
              <input
                type="number"
                value={segment.distanceKm}
                onChange={(e) => updateSegment(segment.id, { distanceKm: Number(e.target.value) })}
              />
            </div>
            <div>
              <label>Type de route</label>
              <select
                value={segment.roadType}
                onChange={(e) => updateSegment(segment.id, { roadType: e.target.value as RoadType })}
              >
                {ROAD_TYPES.map((rt) => (
                  <option key={rt.value} value={rt.value}>
                    {rt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Limitation (km/h)</label>
              <input
                type="number"
                value={segment.speedLimitKmh}
                onChange={(e) => updateSegment(segment.id, { speedLimitKmh: Number(e.target.value) })}
              />
            </div>
            <button
              type="button"
              className="secondary"
              onClick={() => removeSegment(segment.id)}
              aria-label={`Supprimer le segment ${index + 1}`}
            >
              ✕
            </button>
          </div>
        ))}
        <button type="button" className="secondary" onClick={() => setSegments((prev) => [...prev, newSegment()])}>
          + Ajouter un segment
        </button>
      </section>

      <section className="card">
        <h2>Combien de temps supplémentaire acceptez-vous ?</h2>
        <div className="tolerance-options">
          {TOLERANCE_OPTIONS_MIN.map((min) => (
            <div
              key={min}
              className={`tolerance-option${toleranceMin === min ? " selected" : ""}`}
              onClick={() => setToleranceMin(min)}
            >
              {min === 0 ? "0 min" : `${min} min`}
            </div>
          ))}
        </div>
        <button type="button" className="primary" onClick={handleGenerate}>
          Générer les scénarios
        </button>
      </section>

      {scenarios && (
        <section className="card">
          <h2>Résultats</h2>
          <ScenarioCard result={scenarios.recommended} />
          <div style={{ height: 12 }} />
          <div className="scenario-grid">
            <ScenarioCard result={scenarios.fast} />
            <ScenarioCard result={scenarios.balanced} />
            <ScenarioCard result={scenarios.eco} />
          </div>
        </section>
      )}
    </>
  );
}
