import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GET } from "./route";
import { NextRequest } from "next/server";
import { listProviderSettings } from "../../../../server/settings/provider-settings-store";

vi.mock("../../../../server/settings/provider-settings-store", () => ({
  listProviderSettings: vi.fn(),
}));

const VALID_TOKEN = "valid_admin_token_32_characters_long_abcdef";

describe("GET /api/settings/providers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("PROVIDER_ADMIN_TOKEN", VALID_TOKEN);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("should return the list of settings snapshots when authorized", async () => {
    vi.mocked(listProviderSettings).mockResolvedValue([
      {
        providerId: "opendart",
        enabled: true,
        values: {},
        status: "healthy",
        lastCheckedAt: "2026-06-18",
        message: null,
      },
    ]);

    const req = new NextRequest("http://localhost:3000/api/settings/providers", {
      headers: { "x-provider-admin-token": VALID_TOKEN },
    });
    const res = await GET(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("cached");
    expect(json.value).toHaveLength(1);
    expect(json.value[0].providerId).toBe("opendart");
  });
});
