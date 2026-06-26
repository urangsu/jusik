import { describe, it, expect } from "vitest";
import {
  listAiProviders,
  getAiProvider,
  isAiProviderEnabled,
} from "./ai-provider-registry";

describe("ai-provider-registry", () => {
  it("should list all 5 providers", () => {
    const providers = listAiProviders();
    expect(providers).toHaveLength(5);
    const ids = providers.map((p) => p.id);
    expect(ids).toContain("mock");
    expect(ids).toContain("disabled_openai");
    expect(ids).toContain("disabled_anthropic");
    expect(ids).toContain("disabled_gemini");
    expect(ids).toContain("disabled_local");
  });

  it("only mock provider should be enabled", () => {
    expect(isAiProviderEnabled("mock")).toBe(true);
    expect(isAiProviderEnabled("disabled_openai")).toBe(false);
    expect(isAiProviderEnabled("disabled_anthropic")).toBe(false);
    expect(isAiProviderEnabled("disabled_gemini")).toBe(false);
    expect(isAiProviderEnabled("disabled_local")).toBe(false);
  });

  it("all external providers should have status=disabled", () => {
    const providers = listAiProviders();
    const external = providers.filter((p) => p.id !== "mock");
    for (const p of external) {
      expect(p.status).toBe("disabled");
    }
  });

  it("all providers should have supportsStreaming=false", () => {
    const providers = listAiProviders();
    for (const p of providers) {
      expect(p.supportsStreaming).toBe(false);
    }
  });

  it("getAiProvider should return the mock provider", () => {
    const provider = getAiProvider("mock");
    expect(provider.descriptor.id).toBe("mock");
    expect(provider.descriptor.status).toBe("available");
  });

  it("getAiProvider should throw for unknown provider id", () => {
    expect(() =>
      getAiProvider("unknown_provider" as any)
    ).toThrow("not registered");
  });

  it("disabled_openai should require an api key", () => {
    const provider = getAiProvider("disabled_openai");
    expect(provider.descriptor.requiresApiKey).toBe(true);
  });

  it("disabled_local should not require an api key", () => {
    const provider = getAiProvider("disabled_local");
    expect(provider.descriptor.requiresApiKey).toBe(false);
  });
});
