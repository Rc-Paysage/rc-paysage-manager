import { describe, expect, it } from "vitest";
import { classifyObservationForCalibration } from "../../engine/calibration/classification";
import { capturGlobalBaselineObservation } from "../../data/calibration/capturGlobalBaseline";
import { makeObservation } from "./fixtures";

describe("classifyObservationForCalibration", () => {
  it("classifies a homogeneous observation with a known speed bucket as usable", () => {
    const result = classifyObservationForCalibration(makeObservation({ targetSpeedKmh: 110, roadContext: "MOTORWAY" }));
    expect(result.usable).toBe(true);
    if (result.usable) {
      expect(result.roadContext).toBe("MOTORWAY");
      expect(result.speedBucket.id).toBe("110");
      expect(result.representativeSpeedKmh).toBe(110);
    }
  });

  it("prefers targetSpeedKmh over averageSpeedKmh when both are available", () => {
    const result = classifyObservationForCalibration(
      makeObservation({ averageSpeedKmh: 95, targetSpeedKmh: 110, roadContext: "MOTORWAY" })
    );
    expect(result.usable).toBe(true);
    if (result.usable) expect(result.representativeSpeedKmh).toBe(110);
  });

  it("test D — excludes a MIXED route from calibration, with an explicit reason", () => {
    const result = classifyObservationForCalibration(
      makeObservation({ routeHomogeneity: "MIXED", roadContext: "MOTORWAY", targetSpeedKmh: 110 })
    );
    expect(result.usable).toBe(false);
    if (!result.usable) expect(result.reason).toBe("MIXED_ROUTE");
  });

  it("excludes an UNKNOWN homogeneity observation from calibration", () => {
    const result = classifyObservationForCalibration(makeObservation({ routeHomogeneity: "UNKNOWN" }));
    expect(result.usable).toBe(false);
    if (!result.usable) expect(result.reason).toBe("UNKNOWN_HOMOGENEITY");
  });

  it("test E — excludes the Captur GLOBAL_BASELINE reading from calibration", () => {
    const result = classifyObservationForCalibration(capturGlobalBaselineObservation);
    expect(result.usable).toBe(false);
    if (!result.usable) expect(result.reason).toBe("GLOBAL_BASELINE");
  });

  it("excludes an observation with no road context", () => {
    const result = classifyObservationForCalibration(makeObservation({ roadContext: undefined }));
    expect(result.usable).toBe(false);
    if (!result.usable) expect(result.reason).toBe("MISSING_ROAD_CONTEXT");
  });

  it("excludes an observation whose speed falls outside every configured bucket", () => {
    const result = classifyObservationForCalibration(
      makeObservation({ targetSpeedKmh: 45, averageSpeedKmh: 45, roadContext: "URBAN" })
    );
    expect(result.usable).toBe(false);
    if (!result.usable) expect(result.reason).toBe("SPEED_OUTSIDE_CONFIGURED_BUCKETS");
  });
});
