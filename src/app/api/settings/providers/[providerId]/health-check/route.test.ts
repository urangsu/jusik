import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { NextRequest } from "next/server";
import * as healthChecker from "@/server/settings/provider-health-checker";

describe("Health Check API Route Protection", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 400 for unknown providerId", async () => {
    const req = new NextRequest("http://localhost:3000/api/settings/providers/unknown_p/health-check", {
      method: "POST",
    });
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

    const req1 = new NextRequest("http://localhost:3000/api/settings/providers/kis/health-check", { method: "POST" });
    const req2 = new NextRequest("http://localhost:3000/api/settings/providers/kis/health-check", { method: "POST" });

    const params = Promise.resolve({ providerId: "kis" });

    const [res1, res2] = await Promise.all([POST(req1, { params }), POST(req2, { params })]);

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    // Spied health check function must be called exactly once
    expect(checkSpy).toHaveBeenCalledTimes(1);
  });
});
