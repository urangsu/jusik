import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { NextRequest } from "next/server";
import { listFactorCorrelationResults } from "@/server/audit/factor-correlation-store";
import fs from "fs/promises";

vi.mock("@/server/audit/factor-correlation-store", () => ({
  listFactorCorrelationResults: vi.fn(),
}));

vi.mock("fs/promises", () => {
  const accessMock = vi.fn();
  return {
    default: {
      access: accessMock,
    },
    access: accessMock,
  };
});

describe("GET /api/audit/factor-correlation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return not_found if no audit files exist", async () => {
    vi.mocked(fs.access).mockRejectedValue(new Error("ENOENT"));

    const req = new NextRequest("http://localhost/api/audit/factor-correlation");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("not_found");
    expect(json.value).toEqual([]);
  });

  it("should return cached results if they exist", async () => {
    vi.mocked(fs.access).mockResolvedValue(undefined);
    vi.mocked(listFactorCorrelationResults).mockResolvedValue([
      { id: "audit-1", factorA: "momentum_return", factorB: "momentum_turtle" } as any,
    ]);

    const req = new NextRequest("http://localhost/api/audit/factor-correlation?universeId=KOSPI_SAMPLE");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("cached");
    expect(json.value).toHaveLength(1);
    expect(json.value[0].id).toBe("audit-1");
  });

  it("should validate query parameters and return 400 if invalid", async () => {
    const req = new NextRequest("http://localhost/api/audit/factor-correlation?universeId=INVALID_UNIVERSE");
    const res = await GET(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.status).toBe("error");
  });
});
