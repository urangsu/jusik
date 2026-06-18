import { describe, expect, it, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { NextRequest } from "next/server";
import { alertEventStore } from "@/server/alerts/alert-event-store";

vi.mock("@/server/alerts/alert-event-store", () => ({
  alertEventStore: {
    dismissAlert: vi.fn(),
  },
}));

describe("POST /api/alerts/events/[id]/dismiss", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should dismiss alert and return true", async () => {
    vi.mocked(alertEventStore.dismissAlert).mockResolvedValue(undefined);

    const request = new NextRequest("http://localhost/api/alerts/events/evt-123/dismiss", {
      method: "POST",
    });

    const response = await POST(request, { params: Promise.resolve({ id: "evt-123" }) });

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.status).toBe("cached");
    expect(json.value).toBe(true);

    expect(alertEventStore.dismissAlert).toHaveBeenCalledWith("evt-123");
  });

  it("should return 500 error envelope if store throws error", async () => {
    vi.mocked(alertEventStore.dismissAlert).mockRejectedValue(new Error("Store update error"));

    const request = new NextRequest("http://localhost/api/alerts/events/evt-123/dismiss", {
      method: "POST",
    });

    const response = await POST(request, { params: Promise.resolve({ id: "evt-123" }) });

    expect(response.status).toBe(500);
    const json = await response.json();
    expect(json.status).toBe("error");
    expect(json.message).toBe("Store update error");
  });
});
