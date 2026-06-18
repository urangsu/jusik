import { describe, expect, it, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { NextRequest } from "next/server";
import { alertEventStore } from "@/server/alerts/alert-event-store";

vi.mock("@/server/alerts/alert-event-store", () => ({
  alertEventStore: {
    getAlertEvents: vi.fn(),
  },
}));

describe("GET /api/alerts/events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should parse query parameters and return events list", async () => {
    const mockEvents = [
      { id: "evt-1", ruleType: "new_filing", severity: "info" }
    ];
    vi.mocked(alertEventStore.getAlertEvents).mockResolvedValue(mockEvents as any);

    const request = new NextRequest("http://localhost/api/alerts/events?limit=10&unreadOnly=true&ruleType=new_filing&severity=info");
    const response = await GET(request);

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.status).toBe("cached");
    expect(json.value).toEqual(mockEvents);

    expect(alertEventStore.getAlertEvents).toHaveBeenCalledWith({
      limit: 10,
      unreadOnly: true,
      ruleType: "new_filing",
      severity: "info",
    });
  });

  it("should return 500 error envelope when store throws an error", async () => {
    vi.mocked(alertEventStore.getAlertEvents).mockRejectedValue(new Error("Store read error"));

    const request = new NextRequest("http://localhost/api/alerts/events");
    const response = await GET(request);

    expect(response.status).toBe(500);
    const json = await response.json();
    expect(json.status).toBe("error");
    expect(json.message).toBe("Store read error");
  });
});
