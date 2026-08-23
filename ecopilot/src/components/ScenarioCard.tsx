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

function formatEuros(value: number): string {
  return `${value.toFixed(2)} €`;
}

export function ScenarioCard({ result }: { result: ScenarioResult }) {
  const isRecommended = result.scenario.type === "RECOMMENDED";
  const { uncertaintyRange } = result;

  return (
    <div className={`scenario-card${isRecommended ? " recommended" : ""}`}>
      <div className="scenario-title">{LABELS[result.scenario.type]}</div>
      <div className="scenario-metric">
        <span>Temps</span>
        <span>{formatMinutes(result.anchoredDurationMin)}</span>
      </div>
      {result.extraTimeMin > 0.5 && (
        <div className="scenario-metric">
          <span>Temps ajouté</span>
          <span>+{Math.round(result.extraTimeMin)} min</span>
        </div>
      )}
      <div className="scenario-metric">
        <span>Coût</span>
        <span>
          {uncertaintyRange.status === "CALCULATED"
            ? `${formatEuros(uncertaintyRange.lowEuros)} – ${formatEuros(uncertaintyRange.highEuros)}`
            : formatEuros(result.costEuros)}
        </span>
      </div>
      {result.savingsEuros > 0.01 && (
        <div className="scenario-metric">
          <span>Économie</span>
          <span className="savings-badge">{formatEuros(result.savingsEuros)}</span>
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
      <div className="confidence-note">
        {uncertaintyRange.status === "CALCULATED"
          ? `Fourchette de coût basée sur ${uncertaintyRange.basisSampleCount} relevés comparables.`
          : "Incertitude provisoire : pas encore assez de relevés comparables pour calculer une fourchette réelle."}
      </div>
    </div>
  );
}
