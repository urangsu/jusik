import { describe, it, expect, vi } from "vitest";
import { detectProviderHealthAlerts } from "./provider-health-detector";
import { listProviderSettings } from "../../settings/provider-settings-store";
import { ProviderSettingSnapshot } from "../../../domain/settings/provider-setting-snapshot";

vi.mock("../../settings/provider-settings-store", () => ({
  listProviderSettings: vi.fn(),
}));

describe("provider-health-detector", () => {
  it("should skip healthy or configured settings and return empty", async () => {
    const snapshots: ProviderSettingSnapshot[] = [
      {
        providerId: "kis",
        enabled: true,
        values: {},
        status: "healthy",
        lastCheckedAt: "2026-06-18T09:00:00Z",
        message: "정상",
      },
      {
        providerId: "opendart",
        enabled: true,
        values: {},
        status: "configured",
        lastCheckedAt: "2026-06-18T09:00:00Z",
        message: "설정완료",
      },
    ];

    vi.mocked(listProviderSettings).mockResolvedValue(snapshots);

    const events = await detectProviderHealthAlerts();
    expect(events).toEqual([]);
  });

  it("should trigger alert events for unhealthy states with correct severity and rules", async () => {
    const snapshots: ProviderSettingSnapshot[] = [
      {
        providerId: "opendart",
        enabled: true,
        values: {},
        status: "invalid_key",
        lastCheckedAt: "2026-06-18T09:00:00Z",
        message: "등록되지 않은 인증키입니다",
      },
      {
        providerId: "kis",
        enabled: true,
        values: {},
        status: "rate_limited",
        lastCheckedAt: "2026-06-18T09:00:00Z",
        message: "초당 요청 빈도 제한 초과",
      },
      {
        providerId: "fmp",
        enabled: false,
        values: {},
        status: "not_configured",
        lastCheckedAt: "2026-06-18T09:00:00Z",
        message: null,
      },
      {
        providerId: "finnhub",
        enabled: true,
        values: {},
        status: "error",
        lastCheckedAt: "2026-06-18T09:00:00Z",
        message: "Connection timeout",
      },
    ];

    vi.mocked(listProviderSettings).mockResolvedValue(snapshots);

    const events = await detectProviderHealthAlerts();
    expect(events).toHaveLength(4);

    // invalid_key
    const opendartAlert = events.find((e) => e.providerId === "opendart");
    expect(opendartAlert).toBeDefined();
    expect(opendartAlert?.severity).toBe("critical");
    // Message in file: messageKo: `[${snap.providerId}] 상태 이상 (${status})이 감지되었습니다: ${message}`
    expect(opendartAlert?.messageKo).toContain("상태 이상 (invalid_key)이 감지되었습니다");

    // rate_limited
    const kisAlert = events.find((e) => e.providerId === "kis");
    expect(kisAlert).toBeDefined();
    expect(kisAlert?.severity).toBe("warning");
    expect(kisAlert?.ruleType).toBe("provider_rate_limited");

    // not_configured
    const fmpAlert = events.find((e) => e.providerId === "fmp");
    expect(fmpAlert).toBeDefined();
    expect(fmpAlert?.severity).toBe("watch");
    expect(fmpAlert?.ruleType).toBe("provider_error");

    // error
    const finnhubAlert = events.find((e) => e.providerId === "finnhub");
    expect(finnhubAlert).toBeDefined();
    expect(finnhubAlert?.severity).toBe("warning");
    expect(finnhubAlert?.ruleType).toBe("provider_error");
    expect(finnhubAlert?.messageKo).toContain("Connection timeout");
  });
});
