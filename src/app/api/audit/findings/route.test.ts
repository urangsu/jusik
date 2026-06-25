import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { NextRequest } from "next/server";
import { listAuditFindings } from "@/server/audit/audit-finding-store";

vi.mock("@/server/audit/audit-finding-store", () => ({
  listAuditFindings: vi.fn().mockResolvedValue([]),
}));

describe("GET /api/audit/findings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fail with 400 when sourceType parameter is invalid", async () => {
    const req = new NextRequest("http://localhost/api/audit/findings?sourceType=invalid_source");
    const res = await GET(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.status).toBe("error");
    expect(json.message).toContain("Invalid sourceType parameter");
  });

  it("should fail with 400 when scope parameter is invalid", async () => {
    const req = new NextRequest("http://localhost/api/audit/findings?scope=invalid_scope");
    const res = await GET(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.status).toBe("error");
    expect(json.message).toContain("Invalid scope parameter");
  });

  it("should load findings and return DataEnvelope when parameters are valid", async () => {
    const req = new NextRequest("http://localhost/api/audit/findings?universeId=KOSPI_SAMPLE");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("cached");
    expect(json.sourceTier).toBe("manual_import");
    expect(listAuditFindings).toHaveBeenCalled();
  });
});
