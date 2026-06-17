import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { resolveProviderConfigSync } from "./provider-config-resolver";
import { getProviderSettingsSync } from "./provider-settings-store";
import { getProviderSecretSync } from "./provider-secret-store";

vi.mock("./provider-settings-store", () => ({
  getProviderSettingsSync: vi.fn(),
}));

vi.mock("./provider-secret-store", () => ({
  getProviderSecretSync: vi.fn(),
}));

describe("Provider Config Resolver", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should prioritize environment variables over local store values", () => {
    process.env.OPENDART_ENABLED = "true";
    process.env.OPENDART_API_KEY = "env_api_key_123";

    vi.mocked(getProviderSettingsSync).mockReturnValue({
      enabled: false,
      values: {
        OPENDART_ENABLED: false,
        OPENDART_BASE_URL: "https://local.opendart",
      },
      status: "configured",
      lastCheckedAt: null,
      message: null,
    });

    vi.mocked(getProviderSecretSync).mockReturnValue("local_secret_key");

    const resolved = resolveProviderConfigSync("opendart");
    
    // Env key should take priority
    expect(resolved["OPENDART_ENABLED"]).toBe(true);
    expect(resolved["OPENDART_API_KEY"]).toBe("env_api_key_123");
    
    // Non-env key falls back to local store
    expect(resolved["OPENDART_BASE_URL"]).toBe("https://local.opendart");
  });

  it("should fallback to local store if environment variables are missing", () => {
    delete process.env.OPENDART_ENABLED;
    delete process.env.OPENDART_API_KEY;

    vi.mocked(getProviderSettingsSync).mockReturnValue({
      enabled: true,
      values: {
        OPENDART_ENABLED: true,
        OPENDART_BASE_URL: "https://local.opendart",
      },
      status: "configured",
      lastCheckedAt: null,
      message: null,
    });

    vi.mocked(getProviderSecretSync).mockReturnValue("local_secret_key");

    const resolved = resolveProviderConfigSync("opendart");
    expect(resolved["OPENDART_ENABLED"]).toBe(true);
    expect(resolved["OPENDART_API_KEY"]).toBe("local_secret_key");
    expect(resolved["OPENDART_BASE_URL"]).toBe("https://local.opendart");
  });

  it("should fallback to field default values if both env and local store are missing", () => {
    delete process.env.OPENDART_ENABLED;
    delete process.env.OPENDART_BASE_URL;

    vi.mocked(getProviderSettingsSync).mockReturnValue(null);
    vi.mocked(getProviderSecretSync).mockReturnValue(null);

    const resolved = resolveProviderConfigSync("opendart");
    expect(resolved["OPENDART_ENABLED"]).toBe(false); // Default value is false
    expect(resolved["OPENDART_BASE_URL"]).toBe("https://opendart.fss.or.kr/api"); // Default URL
  });
});
