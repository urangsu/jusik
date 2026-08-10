import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "./route";
import { NextRequest } from "next/server";
import * as healthChecker from "@/server/settings/provider-health-checker";

const VALID_TOKEN = "valid_admin_token_32_characters_long_abcdef";

function makeAdminReq(url = "http://localhost:3000/api/settings/providers/kis/health-check") {
  return new NextRequest(url, {
    method: "POST",
    headers: {
      "x-provider-admin-token": VALID_TOKEN,
      origin: "http://localhost:3000",
    },
  });
}

describe("Health Check API Route Protection", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubEnv("PROVIDER_ADMIN_TOKEN", VALID_TOKEN);
    vi.stubEnv("INTERNAL_APP_ORIGIN", "http://localhost:3000");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 400 for unknown providerId", async () => {
    const req = makeAdminReq("http://localhost:3000/api/settings/providers/unknown_p/health-check");
    const params = Promise.resolve({ providerId: "unknown_p" });
    const res = await POST(req, { params });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.message).toContain("Unknown providerId");
  });

  it("deduplicates concurrent requests (single-flight execution)", async () => {
    const checkSpy = vi.spyOn(healthChecker, "checkProviderHealth").mockImplementation(
      async () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                providerId: "kis",
                enabled: true,
                values: {},
                status: "healthy",
                lastCheckedAt: new Date().toISOString(),
                message: "Test success",
              }),
            50
          )
        )
    );

    const req1 = makeAdminReq();
    const req2 = makeAdminReq();

    const params = Promise.resolve({ providerId: "kis" });

    const [res1, res2] = await Promise.all([POST(req1, { params }), POST(req2, { params })]);

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    // Spied health check function must be called exactly once
    expect(checkSpy).toHaveBeenCalledTimes(1);
  });
});
