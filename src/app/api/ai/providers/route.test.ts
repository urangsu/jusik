import { describe, it, expect, vi } from "vitest";
import { GET } from "./route";

describe("GET /api/ai/providers", () => {
  it("should return all 5 providers with manual_import sourceTier", async () => {
    const response = await GET();
    const data = await response.json();

    expect(data.sourceTier).toBe("manual_import");
    expect(data.status).toBe("cached");
    expect(Array.isArray(data.value)).toBe(true);
    expect(data.value).toHaveLength(5);
  });

  it("only mock provider should be available", async () => {
    const response = await GET();
    const data = await response.json();

    const mock = data.value.find((p: any) => p.id === "mock");
    expect(mock?.status).toBe("available");

    const external = data.value.filter((p: any) => p.id !== "mock");
    for (const p of external) {
      expect(p.status).toBe("disabled");
    }
  });

  it("all providers should have supportsStreaming=false", async () => {
    const response = await GET();
    const data = await response.json();

    for (const p of data.value) {
      expect(p.supportsStreaming).toBe(false);
    }
  });
});
