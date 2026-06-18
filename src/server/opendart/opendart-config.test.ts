import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getOpenDartConfig } from "./opendart-config";

vi.mock("../settings/provider-settings-store", () => ({
  getProviderSettingsSync: vi.fn(() => null),
}));

vi.mock("../settings/provider-secret-store", () => ({
  getProviderSecretSync: vi.fn(() => null),
}));

describe("getOpenDartConfig", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should return config with defaults when env is empty", () => {
    delete process.env.OPENDART_ENABLED;
    delete process.env.OPENDART_API_KEY;
    delete process.env.OPENDART_BASE_URL;
    delete process.env.OPENDART_DISCLOSURE_PAGE_COUNT;
    delete process.env.OPENDART_REQUEST_TIMEOUT_MS;
    delete process.env.OPENDART_CACHE_TTL_MINUTES;

    const config = getOpenDartConfig();
    expect(config.enabled).toBe(false);
    expect(config.apiKey).toBeNull();
    expect(config.baseUrl).toBe("https://opendart.fss.or.kr/api");
    expect(config.pageCount).toBe(100);
    expect(config.timeoutMs).toBe(10000);
    expect(config.cacheTtlMinutes).toBe(30);
  });

  it("should return enabled true when enabled and key are provided", () => {
    process.env.OPENDART_ENABLED = "true";
    process.env.OPENDART_API_KEY = "test_api_key_12345";
    process.env.OPENDART_BASE_URL = "https://custom.api.opendart";
    process.env.OPENDART_DISCLOSURE_PAGE_COUNT = "50";
    process.env.OPENDART_REQUEST_TIMEOUT_MS = "5000";
    process.env.OPENDART_CACHE_TTL_MINUTES = "15";

    const config = getOpenDartConfig();
    expect(config.enabled).toBe(true);
    expect(config.apiKey).toBe("test_api_key_12345");
    expect(config.baseUrl).toBe("https://custom.api.opendart");
    expect(config.pageCount).toBe(50);
    expect(config.timeoutMs).toBe(5000);
    expect(config.cacheTtlMinutes).toBe(15);
  });

  it("should clamp pageCount to 100", () => {
    process.env.OPENDART_ENABLED = "true";
    process.env.OPENDART_API_KEY = "test_api_key_12345";
    process.env.OPENDART_DISCLOSURE_PAGE_COUNT = "150";

    const config = getOpenDartConfig();
    expect(config.pageCount).toBe(100);
  });
});
