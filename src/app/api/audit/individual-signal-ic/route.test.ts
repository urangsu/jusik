import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { NextRequest } from "next/server";
import { listIndividualSignalIcResults } from "@/server/audit/individual-signal-ic-store";
import fs from "fs/promises";

vi.mock("@/server/audit/individual-signal-ic-store", () => ({
  listIndividualSignalIcResults: vi.fn(),
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

describe("GET /api/audit/individual-signal-ic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return not_found if no audit files exist", async () => {
    vi.mocked(fs.access).mockRejectedValue(new Error("ENOENT"));

    const req = new NextRequest("http://localhost/api/audit/individual-signal-ic");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("not_found");
    expect(json.value).toEqual([]);
  });

  it("should return cached results if they exist", async () => {
    vi.mocked(fs.access).mockResolvedValue(undefined);
    vi.mocked(listIndividualSignalIcResults).mockResolvedValue([
      { id: "audit-1", signalId: "momentum_return" } as any,
    ]);

    const req = new NextRequest("http://localhost/api/audit/individual-signal-ic?universeId=KOSPI_SAMPLE");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("cached");
    expect(json.value).toHaveLength(1);
    expect(json.value[0].id).toBe("audit-1");
  });
});
