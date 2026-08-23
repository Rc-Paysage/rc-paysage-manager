import { describe, expect, it } from "vitest";
import { isElectricityExternalEnergy } from "../../engine/energySource";

describe("isElectricityExternalEnergy", () => {
  it("is false for a non-rechargeable full hybrid", () => {
    expect(isElectricityExternalEnergy({ energyType: "FULL_HYBRID" })).toBe(false);
  });

  it("is false for pure petrol/diesel vehicles", () => {
    expect(isElectricityExternalEnergy({ energyType: "PETROL" })).toBe(false);
    expect(isElectricityExternalEnergy({ energyType: "DIESEL" })).toBe(false);
  });

  it("is true for a plugin hybrid", () => {
    expect(isElectricityExternalEnergy({ energyType: "PLUGIN_HYBRID" })).toBe(true);
  });

  it("is true for a fully electric vehicle", () => {
    expect(isElectricityExternalEnergy({ energyType: "ELECTRIC" })).toBe(true);
  });
});
