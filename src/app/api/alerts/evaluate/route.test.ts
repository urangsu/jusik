import { describe, expect, it, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { NextRequest } from "next/server";
import { checkJobRouteEnabled } from "@/server/security/job-route-guard";
import { alertEvaluator } from "@/server/alerts/alert-evaluator";

vi.mock("@/server/security/job-route-guard", () => ({
  checkJobRouteEnabled: vi.fn(),
}));

vi.mock("@/server/alerts/alert-evaluator", () => ({
  alertEvaluator: {
    evaluateAlerts: vi.fn(),
  },
}));

describe("POST /api/alerts/evaluate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns guard response if job route is disabled", async () => {
    const mockGuardResponse = new Response("Forbidden", { status: 403 });
    vi.mocked(checkJobRouteEnabled).mockReturnValue(mockGuardResponse);

    const request = new NextRequest("http://localhost/api/alerts/evaluate", {
      method: "POST",
    });

    const response = await POST(request);
    expect(response.status).toBe(403);
    expect(alertEvaluator.evaluateAlerts).not.toHaveBeenCalled();
  });

  it("evaluates alerts and returns safe envelope response on success", async () => {
    vi.mocked(checkJobRouteEnabled).mockReturnValue(null as any);
    const mockSummary = {
      generated: 2,
      saved: 2,
      skipped: 0,
      events: [],
    };
    vi.mocked(alertEvaluator.evaluateAlerts).mockResolvedValue(mockSummary);

    const request = new NextRequest("http://localhost/api/alerts/evaluate", {
      method: "POST",
      body: JSON.stringify({ universeId: "KOSPI_SAMPLE", ruleTypes: ["new_filing"] }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.status).toBe("cached");
    expect(json.value).toEqual(mockSummary);
    expect(alertEvaluator.evaluateAlerts).toHaveBeenCalledWith({
      universeId: "KOSPI_SAMPLE",
      ruleTypes: ["new_filing"],
    });
  });

  it("returns 500 error envelope if evaluator throws error", async () => {
    vi.mocked(checkJobRouteEnabled).mockReturnValue(null as any);
    vi.mocked(alertEvaluator.evaluateAlerts).mockRejectedValue(new Error("Evaluation error"));

    const request = new NextRequest("http://localhost/api/alerts/evaluate", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    expect(response.status).toBe(500);

    const json = await response.json();
    expect(json.status).toBe("error");
    expect(json.message).toBe("Evaluation error");
  });
});
