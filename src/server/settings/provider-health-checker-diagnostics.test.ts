/**
 * Task 2 — orchestration test: production checker saves evaluator result.
 *
 * Tests verify:
 * 1. checkProviderHealth() calls updateProviderStatus with the evaluator's exact result
 * 2. raw upstream body is NOT stored or returned in any message
 * 3. null quote value → provider_error (not healthy)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { checkProviderHealth } from "./provider-health-checker";
import { KisAuthClient } from "../providers/kis/kis-auth-client";
import { kisDomesticStockProvider } from "../providers/kis/kis-domestic-stock-provider";

// ─── Full mock isolation ───────────────────────────────────────────────────
vi.mock("./provider-settings-store", () => ({
  getProviderSettings: vi.fn(),
  updateProviderStatus: vi.fn(),
  updateProviderSettings: vi.fn(),
}));

vi.mock("./provider-config-resolver", () => ({
  resolveProviderConfigSync: vi.fn(),
}));

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

const VALID_CONFIG = {
  KIS_ENABLED: true,
  KIS_APP_KEY: "valid_app_key_1234567",
  KIS_APP_SECRET: "valid_app_secret_1234567890abcde",
  KIS_IS_PAPER: true,
};

function makeHealthySnap(status = "healthy") {
  return {
    providerId: "kis" as const,
    enabled: true,
    values: {},
    status: status as any,
    lastCheckedAt: new Date().toISOString(),
    message: "KIS Open API 시세 연결 및 인증 테스트 성공",
  };
}

describe("provider-health-checker orchestration (Task 2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(KisAuthClient.clearCache).mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("calls updateProviderStatus with exact status and safe message from evaluator (credentials_invalid 401)", async () => {
    vi.mocked(resolveProviderConfigSync).mockReturnValue(VALID_CONFIG);
    vi.mocked(KisAuthClient.getAccessToken).mockRejectedValue(new Error("401 Unauthorized: Invalid AppKey"));
    vi.mocked(getProviderSettings).mockResolvedValue(makeHealthySnap("credentials_invalid"));

    await checkProviderHealth("kis");

    expect(updateProviderStatus).toHaveBeenCalledWith(
      "kis",
      "credentials_invalid",
      "KIS가 App Key 또는 App Secret을 거부했습니다.",
    );
  });

  it("calls updateProviderStatus with provider_error when quote has null value", async () => {
    vi.mocked(resolveProviderConfigSync).mockReturnValue(VALID_CONFIG);
    vi.mocked(KisAuthClient.getAccessToken).mockResolvedValue("test_access_token");
    vi.mocked(kisDomesticStockProvider.getQuote).mockResolvedValue({
      value: null,
      status: "real_time",
      source: "KIS Open API",
      sourceTier: "official",
      warnings: [],
      updatedAt: new Date().toISOString(),
    });
    vi.mocked(getProviderSettings).mockResolvedValue(makeHealthySnap("provider_error"));

    await checkProviderHealth("kis");

    expect(updateProviderStatus).toHaveBeenCalledWith(
      "kis",
      "provider_error",
      "KIS 응답에 사용 가능한 시세 데이터가 없습니다.",
    );
  });

  it("does NOT store raw upstream error body in status message", async () => {
    vi.mocked(resolveProviderConfigSync).mockReturnValue(VALID_CONFIG);
    vi.mocked(KisAuthClient.getAccessToken).mockRejectedValue(
      new Error("upstream-secret-body: appkey=REAL_KEY_DO_NOT_LOG")
    );
    vi.mocked(getProviderSettings).mockResolvedValue(makeHealthySnap("token_failed"));

    await checkProviderHealth("kis");

    expect(updateProviderStatus).not.toHaveBeenCalledWith(
      "kis",
      expect.anything(),
      expect.stringContaining("upstream-secret-body"),
    );
    expect(updateProviderStatus).not.toHaveBeenCalledWith(
      "kis",
      expect.anything(),
      expect.stringContaining("REAL_KEY_DO_NOT_LOG"),
    );
  });

  it("calls updateProviderStatus with disabled for disabled provider", async () => {
    vi.mocked(resolveProviderConfigSync).mockReturnValue({ KIS_ENABLED: false });
    vi.mocked(getProviderSettings).mockResolvedValue(makeHealthySnap("disabled"));

    await checkProviderHealth("kis");

    expect(updateProviderStatus).toHaveBeenCalledWith(
      "kis",
      "disabled",
      expect.stringContaining("비활성화"),
    );
  });

  it("calls updateProviderStatus with healthy on full success", async () => {
    vi.mocked(resolveProviderConfigSync).mockReturnValue(VALID_CONFIG);
    vi.mocked(KisAuthClient.getAccessToken).mockResolvedValue("test_access_token");
    vi.mocked(kisDomesticStockProvider.getQuote).mockResolvedValue({
      value: {
        assetId: "KR:005930", market: "KR", symbol: "005930",
        price: 75000, currency: "KRW", change: 1000, changePct: 1.35,
        volume: 100000, tradeDate: "2026-08-01", updatedAt: "2026-08-01T01:00:00Z",
        source: "KIS Open API", dataVersionId: null,
      },
      status: "real_time",
      source: "KIS Open API",
      sourceTier: "official",
      warnings: [],
      updatedAt: "2026-08-01T01:00:00Z",
    });
    vi.mocked(getProviderSettings).mockResolvedValue(makeHealthySnap("healthy"));

    await checkProviderHealth("kis");

    expect(updateProviderStatus).toHaveBeenCalledWith(
      "kis",
      "healthy",
      "KIS Open API 시세 연결 및 인증 테스트 성공",
    );
  });
});
