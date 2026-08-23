import type { ConsumptionCurvePoint } from "../types";

export interface InterpolatedConsumption {
  litersPer100km: number;
  electricKwhPer100km: number;
  /** CALIBRATED seulement si les deux points encadrants le sont ; ESTIMATED_UNCALIBRATED sinon. */
  source: "ESTIMATED_UNCALIBRATED" | "CALIBRATED";
}

/**
 * Interpole linéairement la consommation à une vitesse donnée à partir de la courbe du véhicule.
 * En dehors de la plage de la courbe, la valeur est bornée au point le plus proche (pas d'extrapolation).
 */
export function interpolateConsumption(
  curve: ConsumptionCurvePoint[],
  speedKmh: number
): InterpolatedConsumption {
  if (curve.length === 0) {
    throw new Error("La courbe de consommation du véhicule est vide.");
  }

  const sorted = [...curve].sort((a, b) => a.speedKmh - b.speedKmh);

  if (speedKmh <= sorted[0].speedKmh) {
    return pointToResult(sorted[0]);
  }
  const last = sorted[sorted.length - 1];
  if (speedKmh >= last.speedKmh) {
    return pointToResult(last);
  }

  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (speedKmh >= a.speedKmh && speedKmh <= b.speedKmh) {
      const ratio = (speedKmh - a.speedKmh) / (b.speedKmh - a.speedKmh);
      return {
        litersPer100km: lerp(a.litersPer100km, b.litersPer100km, ratio),
        electricKwhPer100km: lerp(a.electricKwhPer100km, b.electricKwhPer100km, ratio),
        source: a.source === "CALIBRATED" && b.source === "CALIBRATED" ? "CALIBRATED" : "ESTIMATED_UNCALIBRATED",
      };
    }
  }

  return pointToResult(last);
}

function pointToResult(point: ConsumptionCurvePoint): InterpolatedConsumption {
  return {
    litersPer100km: point.litersPer100km,
    electricKwhPer100km: point.electricKwhPer100km,
    source: point.source,
  };
}

function lerp(a: number, b: number, ratio: number): number {
  return a + (b - a) * ratio;
}
