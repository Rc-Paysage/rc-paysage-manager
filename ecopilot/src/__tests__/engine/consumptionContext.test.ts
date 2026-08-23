import { describe, expect, it } from "vitest";
import { resolveConsumptionCurve, roadTypeToConsumptionContext } from "../../engine/consumptionContext";
import type { ConsumptionCurvePoint } from "../../types";

describe("roadTypeToConsumptionContext", () => {
  it("maps URBAN to URBAN", () => {
    expect(roadTypeToConsumptionContext("URBAN")).toBe("URBAN");
  });

  it("maps RURAL and MAIN_ROAD to ROAD", () => {
    expect(roadTypeToConsumptionContext("RURAL")).toBe("ROAD");
    expect(roadTypeToConsumptionContext("MAIN_ROAD")).toBe("ROAD");
  });

  it("maps EXPRESSWAY and HIGHWAY to MOTORWAY", () => {
    expect(roadTypeToConsumptionContext("EXPRESSWAY")).toBe("MOTORWAY");
    expect(roadTypeToConsumptionContext("HIGHWAY")).toBe("MOTORWAY");
  });
});

describe("resolveConsumptionCurve", () => {
  const defaultCurve: ConsumptionCurvePoint[] = [
    { speedKmh: 50, litersPer100km: 5, electricKwhPer100km: 0, source: "ESTIMATED_UNCALIBRATED" },
  ];
  const urbanCurve: ConsumptionCurvePoint[] = [
    { speedKmh: 50, litersPer100km: 4, electricKwhPer100km: 0, source: "CALIBRATED" },
  ];

  it("falls back to defaultConsumptionCurve when no context-specific profile exists", () => {
    const vehicle = { defaultConsumptionCurve: defaultCurve };
    expect(resolveConsumptionCurve(vehicle, "URBAN")).toBe(defaultCurve);
    expect(resolveConsumptionCurve(vehicle, "MOTORWAY")).toBe(defaultCurve);
  });

  it("uses the context-specific curve when it has been calibrated", () => {
    const vehicle = { defaultConsumptionCurve: defaultCurve, consumptionProfiles: { URBAN: urbanCurve } };
    expect(resolveConsumptionCurve(vehicle, "URBAN")).toBe(urbanCurve);
    // Les autres contextes, non calibrés, retombent toujours sur la courbe par défaut.
    expect(resolveConsumptionCurve(vehicle, "MOTORWAY")).toBe(defaultCurve);
  });
});
