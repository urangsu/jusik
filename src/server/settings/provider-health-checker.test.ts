import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkProviderHealth } from "./provider-health-checker";
import { searchOpenDartDisclosures } from "../opendart/disclosure-search-client";
import { getProviderSettings, updateProviderStatus } from "./provider-settings-store";
import { resolveProviderConfigSync } from "./provider-config-resolver";

vi.mock("../opendart/disclosure-search-client", () => ({
  searchOpenDartDisclosures: vi.fn(),
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

  it("should detect invalid_key for OpenDART credential failure responses", async () => {
    vi.mocked(resolveProviderConfigSync).mockReturnValue({
      OPENDART_ENABLED: true,
      OPENDART_API_KEY: "invalid_key",
    });

    vi.mocked(searchOpenDartDisclosures).mockResolvedValue({
      status: "error",
      message: "등록되지 않은 인증키입니다. (010)",
    } as any);

    vi.mocked(getProviderSettings).mockResolvedValue({
      providerId: "opendart",
      enabled: true,
      values: {},
      status: "invalid_key",
      lastCheckedAt: "2026-06-18",
      message: "유효하지 않은 API Key입니다.",
    });

    const snap = await checkProviderHealth("opendart");
    expect(updateProviderStatus).toHaveBeenCalledWith("opendart", "invalid_key", "유효하지 않은 API Key입니다.");
    expect(snap.status).toBe("invalid_key");
  });

  it("should check simple presence for other providers (e.g. LLM)", async () => {
    vi.mocked(resolveProviderConfigSync).mockReturnValue({
      LLM_ENABLED: true,
      OPENAI_API_KEY: "some_openai_key",
    });

    vi.mocked(getProviderSettings).mockResolvedValue({
      providerId: "llm",
      enabled: true,
      values: {},
      status: "healthy",
      lastCheckedAt: "2026-06-18",
      message: "설정이 완료되었습니다. (연결 테스트 정상)",
    });

    const snap = await checkProviderHealth("llm");
    expect(updateProviderStatus).toHaveBeenCalledWith("llm", "healthy", expect.any(String));
    expect(snap.status).toBe("healthy");
  });
});
