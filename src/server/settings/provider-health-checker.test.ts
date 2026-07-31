import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkProviderHealth } from "./provider-health-checker";
import { searchOpenDartDisclosures } from "../opendart/disclosure-search-client";
import { kisDomesticStockProvider } from "../providers/kis/kis-domestic-stock-provider";
import { getProviderSettings, updateProviderStatus } from "./provider-settings-store";
import { resolveProviderConfigSync } from "./provider-config-resolver";

vi.mock("../opendart/disclosure-search-client", () => ({
  searchOpenDartDisclosures: vi.fn(),
}));

vi.mock("../providers/kis/kis-domestic-stock-provider", () => ({
  kisDomesticStockProvider: {
    getQuote: vi.fn(),
  },
}));

vi.mock("./provider-settings-store", () => ({
  getProviderSettings: vi.fn(),
  updateProviderStatus: vi.fn(),
}));

vi.mock("./provider-config-resolver", () => ({
  resolveProviderConfigSync: vi.fn(),
}));

describe("Provider Health Checker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return not_configured if provider is disabled", async () => {
    vi.mocked(resolveProviderConfigSync).mockReturnValue({
      OPENDART_ENABLED: false,
    });

    vi.mocked(getProviderSettings).mockResolvedValue({
      providerId: "opendart",
      enabled: false,
      values: {},
      status: "not_configured",
      lastCheckedAt: null,
      message: null,
    });

    const snap = await checkProviderHealth("opendart");
    expect(updateProviderStatus).toHaveBeenCalledWith("opendart", "not_configured", expect.any(String));
    expect(snap.status).toBe("not_configured");
  });

  it("should set healthy if OpenDART search succeeds", async () => {
    vi.mocked(resolveProviderConfigSync).mockReturnValue({
      OPENDART_ENABLED: true,
      OPENDART_API_KEY: "valid_key",
    });

    vi.mocked(searchOpenDartDisclosures).mockResolvedValue({
      status: "eod",
      value: { list: [] },
    } as any);

    vi.mocked(getProviderSettings).mockResolvedValue({
      providerId: "opendart",
      enabled: true,
      values: {},
      status: "healthy",
      lastCheckedAt: "2026-06-18",
      message: "정상적으로 연결되었습니다.",
    });

    const snap = await checkProviderHealth("opendart");
    expect(updateProviderStatus).toHaveBeenCalledWith("opendart", "healthy", "정상적으로 연결되었습니다.");
    expect(snap.status).toBe("healthy");
  });

  it("does not report healthy from key presence alone when probe returns error", async () => {
    vi.mocked(resolveProviderConfigSync).mockReturnValue({
      KIS_ENABLED: true,
      KIS_APP_KEY: "invalid-key",
      KIS_APP_SECRET: "invalid-secret",
    });

    vi.mocked(kisDomesticStockProvider.getQuote).mockResolvedValue({
      value: null,
      status: "error",
      source: "KIS Open API",
      sourceTier: "official",
      warnings: [],
      updatedAt: null,
      message: "유효하지 않은 KIS 자격증명입니다. (401)",
    });

    vi.mocked(getProviderSettings).mockResolvedValue({
      providerId: "kis",
      enabled: true,
      values: {},
      status: "invalid_key",
      lastCheckedAt: "2026-07-28",
      message: "유효하지 않은 KIS 자격증명입니다.",
    });

    const snap = await checkProviderHealth("kis");
    expect(updateProviderStatus).toHaveBeenCalledWith("kis", "invalid_key", expect.any(String));
    expect(snap.status).toBe("invalid_key");
  });
});
