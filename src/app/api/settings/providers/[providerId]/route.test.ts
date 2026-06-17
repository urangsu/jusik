import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "./route";
import { NextRequest } from "next/server";
import { getProviderSettings, updateProviderSettings } from "../../../../../server/settings/provider-settings-store";
import { checkSettingsWriteEnabled } from "../../../../../server/security/settings-write-guard";

vi.mock("../../../../../server/settings/provider-settings-store", () => ({
  getProviderSettings: vi.fn(),
  updateProviderSettings: vi.fn(),
}));

vi.mock("../../../../../server/security/settings-write-guard", () => ({
  checkSettingsWriteEnabled: vi.fn(),
}));

describe("API settings/providers/[providerId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET returns provider settings snapshot", async () => {
    vi.mocked(getProviderSettings).mockResolvedValue({
      providerId: "opendart",
      enabled: true,
      values: {},
      status: "healthy",
      lastCheckedAt: "2026-06-18",
      message: null,
    });

    const req = new NextRequest("http://localhost/api/settings/providers/opendart");
    const res = await GET(req, { params: Promise.resolve({ providerId: "opendart" }) });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.value.providerId).toBe("opendart");
  });

  it("POST blocks update if write guard returns forbidden", async () => {
    const mockForbiddenResponse = new Response("Forbidden", { status: 403 });
    vi.mocked(checkSettingsWriteEnabled).mockReturnValue(mockForbiddenResponse);

    const req = new NextRequest("http://localhost/api/settings/providers/opendart", {
      method: "POST",
      body: JSON.stringify({ values: { OPENDART_ENABLED: true } }),
    });
    
    const res = await POST(req, { params: Promise.resolve({ providerId: "opendart" }) });
    expect(res.status).toBe(403);
    expect(updateProviderSettings).not.toHaveBeenCalled();
  });

  it("POST updates settings if write guard passes", async () => {
    vi.mocked(checkSettingsWriteEnabled).mockReturnValue(null);
    vi.mocked(updateProviderSettings).mockResolvedValue({
      providerId: "opendart",
      enabled: true,
      values: { OPENDART_ENABLED: true },
      status: "configured",
      lastCheckedAt: "2026-06-18",
      message: null,
    });

    const req = new NextRequest("http://localhost/api/settings/providers/opendart", {
      method: "POST",
      body: JSON.stringify({ values: { OPENDART_ENABLED: true } }),
    });

    const res = await POST(req, { params: Promise.resolve({ providerId: "opendart" }) });
    expect(res.status).toBe(200);
    expect(updateProviderSettings).toHaveBeenCalledWith("opendart", { OPENDART_ENABLED: true });
  });
});
