"use client";

import { useEffect, useState } from "react";
import { loadLastRecommendation, type LastRecommendation } from "../../lib/lastRecommendation";

const ROAD_LABELS: Record<string, string> = {
  HIGHWAY: "Autoroute",
  EXPRESSWAY: "Voie rapide",
  MAIN_ROAD: "Route",
  RURAL: "Route",
  URBAN: "Ville",
};

function formatMinutes(min: number): string {
  const hours = Math.floor(min / 60);
  const minutes = Math.round(min % 60);
  return hours > 0 ? `${hours} h ${minutes.toString().padStart(2, "0")}` : `${minutes} min`;
}

/**
 * Mode Conduite (§14 cahier des charges) : une jauge, très lisible, aucune interaction requise,
 * pas de pop-up. À poser sur le téléphone pendant que Waze occupe l'écran CarPlay de la voiture.
 * Maintient l'écran allumé via Wake Lock quand le navigateur le permet.
 */
export default function DriveModePage() {
  const [recommendation, setRecommendation] = useState<LastRecommendation | null | undefined>(undefined);

  useEffect(() => {
    setRecommendation(loadLastRecommendation() ?? null);
  }, []);

  useEffect(() => {
    let sentinel: { release: () => Promise<void> } | undefined;
    const nav = navigator as Navigator & { wakeLock?: { request: (type: "screen") => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock
      ?.request("screen")
      .then((lock) => {
        sentinel = lock;
      })
      .catch(() => undefined);
    return () => {
      sentinel?.release().catch(() => undefined);
    };
  }, []);

  if (recommendation === undefined) {
    return null;
  }

  if (recommendation === null) {
    return (
      <div className="drive">
        <p className="drive-label">Aucun trajet calculé</p>
        <a className="button primary" href="/">
          Préparer un trajet
        </a>
      </div>
    );
  }

  const speeds = Object.entries(recommendation.targetSpeedsByRoadType);

  return (
    <div className="drive">
      <p className="drive-label">Vitesse conseillée</p>
      <div className="drive-speeds">
        {speeds.map(([roadType, speed]) => (
          <div className="drive-speed" key={roadType}>
            <span className="drive-speed-value">{Math.round(speed)}</span>
            <span className="drive-speed-unit">km/h · {ROAD_LABELS[roadType] ?? roadType}</span>
          </div>
        ))}
      </div>

      <p className="drive-label">Économie estimée sur ce trajet</p>
      <div className="drive-savings">{recommendation.savingsEuros.toFixed(2)} €</div>
      <p className="drive-sub">
        {recommendation.fuelSavedLiters.toFixed(1)} L · {(recommendation.co2AvoidedGrams / 1000).toFixed(1)} kg CO₂
      </p>

      <p className="drive-footer">
        {formatMinutes(recommendation.anchoredDurationMin)}
        {recommendation.extraTimeMin > 0.5 ? ` · +${Math.round(recommendation.extraTimeMin)} min` : ""}
        {recommendation.timeAnchorStatus !== "APPLIED" ? " · durée théorique" : ""}
      </p>
      <a className="drive-exit" href="/">
        Quitter
      </a>
    </div>
  );
}
