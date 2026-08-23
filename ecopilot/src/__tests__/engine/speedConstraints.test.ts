import { describe, expect, it } from "vitest";
import { clampToSafeSpeed, resolveMinSpeedKmh, DEFAULT_SPEED_CONSTRAINTS } from "../../engine/speedConstraints";

describe("resolveMinSpeedKmh", () => {
  it("never exceeds the segment's own legal speed limit", () => {
    // Limite très basse, en dessous du plancher opérationnel habituel de l'autoroute.
    const min = resolveMinSpeedKmh("HIGHWAY", 50);
    expect(min).toBeLessThanOrEqual(50);
  });

  it("uses the road type's operational floor when the speed limit leaves room for it", () => {
    // A 110 km/h, 70% de la limite (77) est en dessous du plancher opérationnel (90) :
    // c'est donc bien le plancher qui s'applique, pas la fraction de la limite.
    const min = resolveMinSpeedKmh("HIGHWAY", 110);
    expect(min).toBe(DEFAULT_SPEED_CONSTRAINTS.HIGHWAY.minReasonableSpeedKmh);
  });

  it("differs by road type for the same speed limit", () => {
    const highwayMin = resolveMinSpeedKmh("HIGHWAY", 90);
    const urbanMin = resolveMinSpeedKmh("URBAN", 90);
    expect(highwayMin).toBeGreaterThan(urbanMin);
  });
});

describe("clampToSafeSpeed", () => {
  it("never returns a speed above the legal speed limit", () => {
    expect(clampToSafeSpeed("HIGHWAY", 130, 200)).toBeLessThanOrEqual(130);
  });

  it("never returns a speed below the road type's operational floor", () => {
    const speed = clampToSafeSpeed("HIGHWAY", 130, 10);
    expect(speed).toBeGreaterThanOrEqual(DEFAULT_SPEED_CONSTRAINTS.HIGHWAY.minReasonableSpeedKmh);
  });

  it("returns the requested speed unchanged when it is already within the safe range", () => {
    expect(clampToSafeSpeed("URBAN", 50, 35)).toBe(35);
  });

  it("respects a custom constraint table", () => {
    const customConstraints = {
      ...DEFAULT_SPEED_CONSTRAINTS,
      URBAN: { minReasonableSpeedKmh: 10, minSpeedFactorOfLimit: 0.1 },
    };
    expect(clampToSafeSpeed("URBAN", 50, 12, customConstraints)).toBe(12);
  });
});

describe("§4 audit correctif — 80 km/h is not a general legal minimum for HIGHWAY", () => {
  it("has no minLegalSpeedKmh field on any road type's constraint", () => {
    (Object.keys(DEFAULT_SPEED_CONSTRAINTS) as Array<keyof typeof DEFAULT_SPEED_CONSTRAINTS>).forEach((roadType) => {
      expect("minLegalSpeedKmh" in DEFAULT_SPEED_CONSTRAINTS[roadType]).toBe(false);
    });
  });

  it("allows a HIGHWAY segment with a low speed limit to clamp below 80 km/h", () => {
    // Si 80 km/h était encore traité comme un minimum légal général d'autoroute, une limitation
    // à 70 km/h (chantier, zone dense) ne pourrait jamais être respectée par le plancher.
    const speed = clampToSafeSpeed("HIGHWAY", 70, 70);
    expect(speed).toBeLessThan(80);
    expect(speed).toBe(70);
  });

  it("HIGHWAY's operational floor is a configurable product/safety value, not a hardcoded legal one", () => {
    // Le plancher HIGHWAY par défaut (90) reste un choix produit — vérifié explicitement
    // remplaçable via une table de contraintes personnalisée, sans notion légale attachée.
    const customConstraints = {
      ...DEFAULT_SPEED_CONSTRAINTS,
      HIGHWAY: { minReasonableSpeedKmh: 60, minSpeedFactorOfLimit: 0.5 },
    };
    expect(resolveMinSpeedKmh("HIGHWAY", 130, customConstraints)).toBe(65);
  });
});
