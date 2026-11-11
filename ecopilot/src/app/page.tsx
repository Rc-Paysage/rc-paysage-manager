"use client";

import { useState } from "react";
import { buildSimpleTrip, buildWazeUrl, SIMPLE_TRIP_KINDS, type SimpleTripKind } from "../lib/simpleTrip";
import { planTrip, type PlannedScenarios } from "../lib/planTrip";
import { DEFAULT_USER_PREFERENCES } from "../types";
import { ScenarioCard } from "../components/ScenarioCard";

const TOLERANCE_OPTIONS_MIN = [0, 5, 10, 15, 30];

export default function HomePage() {
  const [destination, setDestination] = useState("");
  const [distanceKm, setDistanceKm] = useState("");
  const [kind, setKind] = useState<SimpleTripKind>("MOTORWAY");
  const [gpsDurationMin, setGpsDurationMin] = useState("");
  const [toleranceMin, setToleranceMin] = useState(DEFAULT_USER_PREFERENCES.timeToleranceMin);
  const [scenarios, setScenarios] = useState<PlannedScenarios | null>(null);

  const distance = Number(distanceKm);
  const canPlan = distance > 0;

  function handlePlan() {
    if (!canPlan) return;
    const trip = buildSimpleTrip({
      distanceKm: distance,
      kind,
      destination,
      gpsDurationMin: gpsDurationMin ? Number(gpsDurationMin) : undefined,
    });
    setScenarios(planTrip(trip, toleranceMin));
  }

  const recommended = scenarios?.recommended;
  const wazeUrl = buildWazeUrl(destination || "");

  return (
    <>
      <section className="card">
        <h2>Mon trajet</h2>
        <label htmlFor="destination">Destination</label>
        <input
          id="destination"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder="Ville ou adresse"
          autoComplete="off"
        />
        <div className="field-row">
          <div>
            <label htmlFor="distanceKm">Distance (km)</label>
            <input
              id="distanceKm"
              type="number"
              inputMode="decimal"
              value={distanceKm}
              onChange={(e) => setDistanceKm(e.target.value)}
              placeholder="ex. 120"
            />
          </div>
          <div>
            <label htmlFor="gpsDurationMin">Durée annoncée par Waze (min)</label>
            <input
              id="gpsDurationMin"
              type="number"
              inputMode="numeric"
              value={gpsDurationMin}
              onChange={(e) => setGpsDurationMin(e.target.value)}
              placeholder="facultatif"
            />
          </div>
        </div>

        <label>Type de trajet</label>
        <div className="tolerance-options">
          {SIMPLE_TRIP_KINDS.map((option) => (
            <button
              type="button"
              key={option.value}
              className={`tolerance-option${kind === option.value ? " selected" : ""}`}
              onClick={() => setKind(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <label>Temps supplémentaire accepté</label>
        <div className="tolerance-options">
          {TOLERANCE_OPTIONS_MIN.map((min) => (
            <button
              type="button"
              key={min}
              className={`tolerance-option${toleranceMin === min ? " selected" : ""}`}
              onClick={() => setToleranceMin(min)}
            >
              {min === 0 ? "0" : `+${min}`} min
            </button>
          ))}
        </div>

        <button type="button" className="primary" onClick={handlePlan} disabled={!canPlan}>
          Calculer ma stratégie
        </button>
        <p className="hint">
          Besoin de découper le trajet segment par segment ? <a href="/avance">Mode avancé</a>
        </p>
      </section>

      {scenarios && recommended && (
        <>
          <section className="card">
            <ScenarioCard result={recommended} />
            <div className="action-row">
              <a className="button primary" href="/conduite">
                Mode conduite
              </a>
              <a className="button waze" href={wazeUrl} target="_blank" rel="noopener noreferrer">
                Ouvrir dans Waze
              </a>
            </div>
            {recommended.timeAnchorStatus !== "APPLIED" && (
              <p className="hint">
                Renseignez la durée annoncée par Waze pour que les temps affichés collent à la réalité du trafic.
              </p>
            )}
          </section>

          <section className="card">
            <h2>Autres stratégies</h2>
            <div className="scenario-grid">
              <ScenarioCard result={scenarios.fast} />
              <ScenarioCard result={scenarios.balanced} />
              <ScenarioCard result={scenarios.eco} />
            </div>
          </section>
        </>
      )}
    </>
  );
}
