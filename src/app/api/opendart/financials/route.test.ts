import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

vi.mock("@/server/opendart/opendart-config", () => ({
  getOpenDartConfig: vi.fn(),
}));

import { getOpenDartConfig } from "@/server/opendart/opendart-config";

describe("GET /api/opendart/financials", () => {
  it("returns insufficient_data when corpCode is missing", async () => {
    vi.mocked(getOpenDartConfig).mockReturnValue({
      enabled: false,
      apiKey: null,
      baseUrl: "https://opendart.fss.or.kr/api",
      pageCount: 100,
      timeoutMs: 10000,
      cacheTtlMinutes: 30,
    });

    const response = await GET(new NextRequest("http://localhost/api/opendart/financials"));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.status).toBe("insufficient_data");
    expect(data.value).toBeNull();
  });

  it("returns api_required without OpenDART credentials", async () => {
    vi.mocked(getOpenDartConfig).mockReturnValue({
      enabled: false,
      apiKey: null,
      baseUrl: "https://opendart.fss.or.kr/api",
      pageCount: 100,
      timeoutMs: 10000,
      cacheTtlMinutes: 30,
    });

    const response = await GET(new NextRequest("http://localhost/api/opendart/financials?corpCode=00126380"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe("api_required");
    expect(data.value).toBeNull();
  });

  it("returns not_supported instead of fake financial data when configured", async () => {
    vi.mocked(getOpenDartConfig).mockReturnValue({
      enabled: true,
      apiKey: "configured",
      baseUrl: "https://opendart.fss.or.kr/api",
      pageCount: 100,
      timeoutMs: 10000,
      cacheTtlMinutes: 30,
    });

    const response = await GET(new NextRequest("http://localhost/api/opendart/financials?corpCode=00126380"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe("not_supported");
    expect(data.value).toBeNull();
  });
});
