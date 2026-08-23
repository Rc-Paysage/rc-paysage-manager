import type { ScenarioResult } from "../types";

const LABELS: Record<ScenarioResult["scenario"]["type"], string> = {
  FAST: "Rapide",
  BALANCED: "Équilibré",
  ECO: "Éco",
  RECOMMENDED: "EcoPilot recommande",
};

function formatMinutes(min: number): string {
  const hours = Math.floor(min / 60);
  const minutes = Math.round(min % 60);
  return hours > 0 ? `${hours} h ${minutes.toString().padStart(2, "0")}` : `${minutes} min`;
}

/**
 * Affiche une estimation, jamais comme une mesure exacte (§2.3) : une fourchette basée sur le
 * niveau de confiance plutôt qu'une fausse précision à deux décimales.
 */
function formatConfidenceRange(value: number, confidence: number, unit: string): string {
  const spread = value * (1 - confidence) * 0.5;
  const low = Math.max(0, value - spread);
  const high = value + spread;
  if (spread < value * 0.02) {
    return `${value.toFixed(2)} ${unit}`;
  }
  return `${low.toFixed(2)} – ${high.toFixed(2)} ${unit}`;
}

export function ScenarioCard({ result }: { result: ScenarioResult }) {
  const isRecommended = result.scenario.type === "RECOMMENDED";

  return (
    <div className={`scenario-card${isRecommended ? " recommended" : ""}`}>
      <div className="scenario-title">{LABELS[result.scenario.type]}</div>
      <div className="scenario-metric">
        <span>Temps</span>
        <span>{formatMinutes(result.durationMin)}</span>
      </div>
      {result.extraTimeMin > 0.5 && (
        <div className="scenario-metric">
          <span>Temps ajouté</span>
          <span>+{Math.round(result.extraTimeMin)} min</span>
        </div>
      )}
      <div className="scenario-metric">
        <span>Coût</span>
        <span>{formatConfidenceRange(result.costEuros, result.confidenceScore, "€")}</span>
      </div>
      {result.savingsEuros > 0.01 && (
        <div className="scenario-metric">
          <span>Économie</span>
          <span className="savings-badge">
            {formatConfidenceRange(result.savingsEuros, result.confidenceScore, "€")}
          </span>
        </div>
      )}
      <div className="scenario-metric">
        <span>Carburant</span>
        <span>{result.fuelLiters.toFixed(2)} L</span>
      </div>
      <div className="scenario-metric">
        <span>CO₂</span>
        <span>{(result.co2Grams / 1000).toFixed(2)} kg</span>
      </div>
      <div className="confidence-note">Confiance : {Math.round(result.confidenceScore * 100)} %</div>
    </div>
  );
}
