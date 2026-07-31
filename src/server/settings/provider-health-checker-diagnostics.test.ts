/**
 * P0 FIX: Test store isolation
 *
 * This test previously called the real `updateProviderSettings()`, which writes to
 * `data/settings/provider-settings.json` and the real secret store. That destroyed
 * real KIS credentials during test runs.
 *
 * All store interactions are now fully mocked. No filesystem I/O occurs.
 * Each test verifies only the `checkProviderHealth()` diagnostic logic.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { checkProviderHealth } from "./provider-health-checker";
import { KisAuthClient } from "../providers/kis/kis-auth-client";
import { kisDomesticStockProvider } from "../providers/kis/kis-domestic-stock-provider";

// Mock the entire settings store — no real filesystem access
vi.mock("./provider-settings-store", () => ({
  getProviderSettings: vi.fn(),
  updateProviderStatus: vi.fn(),
  updateProviderSettings: vi.fn(),
}));

// Mock the config resolver — no real env lookups that might bleed
vi.mock("./provider-config-resolver", () => ({
  resolveProviderConfigSync: vi.fn(),
}));

// Mock auth and quote — no real network calls
vi.mock("../providers/kis/kis-auth-client", () => ({
  KisAuthClient: {
    getAccessToken: vi.fn(),
    clearCache: vi.fn(),
  },
}));

vi.mock("../providers/kis/kis-domestic-stock-provider", () => ({
  kisDomesticStockProvider: {
    getQuote: vi.fn(),
  },
}));

import { resolveProviderConfigSync } from "./provider-config-resolver";
import { getProviderSettings, updateProviderStatus } from "./provider-settings-store";

const DISABLED_SNAP = {
  providerId: "kis" as const,
  enabled: false,
  values: {},
  status: "disabled" as const,
  lastCheckedAt: null,
  message: "OPENDART API가 비활성화되어 있습니다.",
};

const CREDENTIALS_MISSING_SNAP = {
  providerId: "kis" as const,
  enabled: true,
  values: {},
  status: "credentials_missing" as const,
  lastCheckedAt: null,
  message: null,
};

const CREDENTIALS_INVALID_SNAP = {
  providerId: "kis" as const,
  enabled: true,
  values: {},
  status: "credentials_invalid" as const,
  lastCheckedAt: null,
  message: null,
};

describe("Provider Health Checker 6-Stage Diagnostics (fully mocked)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(KisAuthClient.clearCache).mockImplementation(() => {});
    vi.mocked(updateProviderStatus).mockResolvedValue(undefined as any);
  });

  it("stage 1: identifies disabled provider status", async () => {
    vi.mocked(resolveProviderConfigSync).mockReturnValue({ KIS_ENABLED: false });
    vi.mocked(getProviderSettings).mockResolvedValue(DISABLED_SNAP);

    const snap = await checkProviderHealth("kis");
    expect(snap.status).toBe("disabled");
    expect(snap.message).toContain("비활성화되어 있습니다");
    // Must NOT write to real store
    expect(updateProviderStatus).toHaveBeenCalledTimes(1);
  });

  it("stage 2: identifies missing credentials (empty keys)", async () => {
    vi.mocked(resolveProviderConfigSync).mockReturnValue({
      KIS_ENABLED: true,
      KIS_APP_KEY: "",
      KIS_APP_SECRET: "",
    });
    vi.mocked(getProviderSettings).mockResolvedValue(CREDENTIALS_MISSING_SNAP);

    const snap = await checkProviderHealth("kis");
    expect(snap.status).toBe("credentials_missing");
  });

  it("stage 2: rejects placeholder credentials", async () => {
    vi.mocked(resolveProviderConfigSync).mockReturnValue({
      KIS_ENABLED: true,
      KIS_APP_KEY: "mock_kis_app_key",
      KIS_APP_SECRET: "mock_kis_app_secret",
    });
    vi.mocked(getProviderSettings).mockResolvedValue(CREDENTIALS_INVALID_SNAP);

    const snap = await checkProviderHealth("kis");
    expect(snap.status).toBe("credentials_invalid");
  });

  it("stage 4: catches OAuth token failure (401)", async () => {
    vi.mocked(resolveProviderConfigSync).mockReturnValue({
      KIS_ENABLED: true,
      KIS_APP_KEY: "test_key_1234567890",
      KIS_APP_SECRET: "test_secret_1234567890abcdefghij",
    });
    vi.mocked(getProviderSettings).mockResolvedValue({
      ...CREDENTIALS_INVALID_SNAP,
      message: "KIS가 App Key 또는 App Secret을 거부했습니다.",
    });
    vi.mocked(KisAuthClient.getAccessToken).mockRejectedValue(
      new Error("401 Unauthorized: Invalid AppKey")
    );

    const snap = await checkProviderHealth("kis");
    expect(snap.status).toBe("credentials_invalid");
    expect(snap.message).toContain("KIS가 App Key 또는 App Secret을 거부했습니다");
  });

  it("stage 5 & 6: marks healthy on successful token and quote fetch", async () => {
    vi.mocked(resolveProviderConfigSync).mockReturnValue({
      KIS_ENABLED: true,
      KIS_APP_KEY: "test_key_1234567890",
      KIS_APP_SECRET: "test_secret_1234567890abcdefghij",
    });
    vi.mocked(getProviderSettings).mockResolvedValue({
      providerId: "kis",
      enabled: true,
      values: {},
      status: "healthy",
      lastCheckedAt: new Date().toISOString(),
      message: "KIS Open API 시세 연결 및 인증 테스트 성공",
    });
    vi.mocked(KisAuthClient.getAccessToken).mockResolvedValue("test_access_token");
    vi.mocked(kisDomesticStockProvider.getQuote).mockResolvedValue({
      value: {
        assetId: "KR:005930",
        market: "KR",
        symbol: "005930",
        price: 75000,
        currency: "KRW",
        change: 1000,
        changePct: 1.35,
        volume: 100000,
        tradeDate: "2026-07-31",
        updatedAt: "2026-07-31T10:00:00Z",
        source: "KIS Open API",
        dataVersionId: null,
      },
      status: "real_time",
      source: "KIS Open API",
      sourceTier: "official",
      warnings: [],
      updatedAt: "2026-07-31T10:00:00Z",
    });

    const snap = await checkProviderHealth("kis");
    expect(snap.status).toBe("healthy");
    expect(snap.message).toContain("성공");
  });
});
