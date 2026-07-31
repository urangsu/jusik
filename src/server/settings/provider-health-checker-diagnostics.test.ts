import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { checkProviderHealth } from "./provider-health-checker";
import { kisConfig } from "../providers/kis/kis-config";
import { KisAuthClient } from "../providers/kis/kis-auth-client";
import { kisDomesticStockProvider } from "../providers/kis/kis-domestic-stock-provider";
import { updateProviderSettings } from "./provider-settings-store";

describe("Provider Health Checker 6-Stage Diagnostics", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.KIS_ENABLED;
    delete process.env.KIS_APP_KEY;
    delete process.env.KIS_APP_SECRET;
    delete process.env.KIS_IS_PAPER;
    delete process.env.KIS_BASE_URL;
    KisAuthClient.clearCache();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("stage 1: identifies disabled provider status", async () => {
    await updateProviderSettings("kis", { KIS_ENABLED: false });
    const snap = await checkProviderHealth("kis");
    expect(snap.status).toBe("disabled");
    expect(snap.message).toContain("비활성화되어 있습니다");
  });

  it("stage 2: identifies missing credentials", async () => {
    process.env.KIS_ENABLED = "true";
    process.env.KIS_APP_KEY = "";
    process.env.KIS_APP_SECRET = "";
    await updateProviderSettings("kis", { KIS_ENABLED: true, KIS_APP_KEY: "", KIS_APP_SECRET: "" });

    const snap = await checkProviderHealth("kis");
    expect(snap.status).toBe("credentials_missing");
    expect(snap.message).toContain("저장되지 않았습니다");
  });

  it("stage 2: rejects placeholder credentials", async () => {
    process.env.KIS_ENABLED = "true";
    process.env.KIS_APP_KEY = "mock_kis_app_key";
    process.env.KIS_APP_SECRET = "mock_kis_app_secret";
    await updateProviderSettings("kis", { KIS_ENABLED: true, KIS_APP_KEY: "mock_kis_app_key", KIS_APP_SECRET: "mock_kis_app_secret" });

    const snap = await checkProviderHealth("kis");
    expect(snap.status).toBe("credentials_invalid");
    expect(snap.message).toContain("placeholder");
  });

  it("stage 4: catches OAuth token failure with exact error message", async () => {
    process.env.KIS_ENABLED = "true";
    process.env.KIS_APP_KEY = "real_key";
    process.env.KIS_APP_SECRET = "real_secret";
    await updateProviderSettings("kis", { KIS_ENABLED: true, KIS_APP_KEY: "real_key", KIS_APP_SECRET: "real_secret" });

    vi.spyOn(KisAuthClient, "getAccessToken").mockRejectedValue(new Error("401 Unauthorized: Invalid AppKey"));

    const snap = await checkProviderHealth("kis");
    expect(snap.status).toBe("credentials_invalid");
    expect(snap.message).toContain("KIS가 App Key 또는 App Secret을 거부했습니다");
  });

  it("stage 5 & 6: marks healthy on successful token and quote fetch", async () => {
    process.env.KIS_ENABLED = "true";
    process.env.KIS_APP_KEY = "real_key";
    process.env.KIS_APP_SECRET = "real_secret";
    await updateProviderSettings("kis", { KIS_ENABLED: true, KIS_APP_KEY: "real_key", KIS_APP_SECRET: "real_secret" });

    vi.spyOn(KisAuthClient, "getAccessToken").mockResolvedValue("test_access_token");
    vi.spyOn(kisDomesticStockProvider, "getQuote").mockResolvedValue({
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
