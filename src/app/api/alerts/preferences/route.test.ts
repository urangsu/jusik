import { describe, expect, it, vi, beforeEach } from "vitest";
import { GET, POST } from "./route";
import { NextRequest } from "next/server";
import { alertPreferenceStore } from "@/server/alerts/alert-preference-store";
import { checkSettingsWriteEnabled } from "@/server/security/settings-write-guard";

vi.mock("@/server/alerts/alert-preference-store", () => ({
  alertPreferenceStore: {
    getPreferences: vi.fn(),
    savePreferences: vi.fn(),
  },
}));

vi.mock("@/server/security/settings-write-guard", () => ({
  checkSettingsWriteEnabled: vi.fn(),
}));

describe("GET /api/alerts/preferences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return preferences envelope on success", async () => {
    const mockPrefs = { enabled: true, minSeverity: "info" };
    vi.mocked(alertPreferenceStore.getPreferences).mockResolvedValue(mockPrefs as any);

    const request = new NextRequest("http://localhost/api/alerts/preferences");
    const response = await GET(request);

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.status).toBe("cached");
    expect(json.value).toEqual(mockPrefs);
    expect(alertPreferenceStore.getPreferences).toHaveBeenCalled();
  });
});

describe("POST /api/alerts/preferences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should guard POST if checkSettingsWriteEnabled fails", async () => {
    const mockGuardResponse = new Response("Forbidden", { status: 403 });
    vi.mocked(checkSettingsWriteEnabled).mockReturnValue(mockGuardResponse);

    const request = new NextRequest("http://localhost/api/alerts/preferences", {
      method: "POST",
      body: JSON.stringify({ enabled: false }),
    });

    const response = await POST(request);
    expect(response.status).toBe(403);
    expect(alertPreferenceStore.savePreferences).not.toHaveBeenCalled();
  });

  it("should save and return updated preferences if settings write is enabled", async () => {
    vi.mocked(checkSettingsWriteEnabled).mockReturnValue(null as any);
    const mockPrefs = { enabled: false, minSeverity: "info" };
    vi.mocked(alertPreferenceStore.savePreferences).mockResolvedValue(mockPrefs as any);

    const request = new NextRequest("http://localhost/api/alerts/preferences", {
      method: "POST",
      body: JSON.stringify({ enabled: false }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.status).toBe("cached");
    expect(json.value).toEqual(mockPrefs);

    expect(alertPreferenceStore.savePreferences).toHaveBeenCalledWith({ enabled: false });
  });
});
