import { describe, expect, it } from "vitest";
import { calculateICIR } from "./calculate-icir";

describe("calculateICIR", () => {
  it("returns insufficient_data when IC history is shorter than the window", () => {
    const output = calculateICIR({ icValues: [0.01, 0.02], window: 3 });

    expect(output.status).toBe("insufficient_data");
    expect(output.value).toBeNull();
    expect(output.sampleSize).toBe(2);
  });

  it("returns insufficient_data when sample standard deviation is zero", () => {
    const output = calculateICIR({ icValues: [0.05, 0.05, 0.05], window: 3 });

    expect(output.status).toBe("insufficient_data");
    expect(output.value).toBeNull();
  });

  it("returns a finite ICIR for valid IC history", () => {
    const output = calculateICIR({ icValues: [0.01, 0.02, 0.04, 0.03], window: 4 });

    expect(output.status).toBe("ok");
    expect(output.value).not.toBeNull();
    expect(Number.isFinite(output.value?.icir)).toBe(true);
  });
});
