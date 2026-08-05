import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { finnhubFreeProvider } from "./finnhub-free-provider";
import { providerRegistry } from "./provider-registry";
import { resolveProviderConfigSync } from "../settings/provider-config-resolver";

vi.mock("../settings/provider-config-resolver", () => ({
  resolveProviderConfigSync: vi.fn((providerId) => {
    if (providerId === "kis") {
      return { KIS_APP_KEY: "mock", KIS_APP_SECRET: "mock", KIS_IS_PAPER: true };
    }
    return {
      FINNHUB_API_KEY: "test_finnhub_key_123",
      FINNHUB_ENABLED: true,
    };
  }),
}));

describe("Finnhub Free Provider parser checks", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.spyOn(providerRegistry, "isEnabled").mockReturnValue(true);
    vi.mocked(resolveProviderConfigSync).mockReturnValue({
      FINNHUB_API_KEY: "test_finnhub_key_123",
      FINNHUB_ENABLED: true,
    });
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("should successfully retrieve and parse a quote envelope", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        c: 150.25,
        d: 2.5,
        dp: 1.69,
        h: 151.0,
        l: 149.0,
        o: 149.5,
        pc: 147.75,
        t: 1689259200,
      }),
    } as any);

    const envelope = await finnhubFreeProvider.getQuote("AAPL");

    expect(envelope.status).toBe("delayed");
    expect(envelope.value).not.toBeNull();
    expect(envelope.value?.price).toBe(150.25);
    expect(envelope.value?.change).toBe(2.5);
    expect(envelope.value?.changePct).toBe(1.69);
    expect(envelope.value?.currency).toBe("USD");
    expect(fetchSpy).toHaveBeenCalled();
  });

  it("should return not_found if symbol does not exist on Finnhub", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        c: 0,
        d: null,
        dp: null,
        h: 0,
        l: 0,
        o: 0,
        pc: 0,
        t: 0,
      }),
    } as any);

    const envelope = await finnhubFreeProvider.getQuote("XYZ_UNKNOWN");
    expect(envelope.status).toBe("not_found");
    expect(envelope.value).toBeNull();
  });

  it("should return plan_restricted if token is invalid or resolution is forbidden (403)", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ error: "API key is invalid." }),
    } as any);

    const envelope = await finnhubFreeProvider.getQuote("AAPL");
    expect(envelope.status).toBe("plan_restricted");
    expect(envelope.value).toBeNull();
    expect(envelope.message).toContain("invalid");
  });

  it("should successfully retrieve and parse historical candles (OHLCV)", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        s: "ok",
        t: [1689259200],
        o: [150.0],
        h: [152.0],
        l: [149.0],
        c: [151.5],
        v: [50000000],
      }),
    } as any);

    const envelope = await finnhubFreeProvider.getOhlcv({
      symbol: "AAPL",
      region: "US",
      range: "1M",
      interval: "1D",
    });

    expect(envelope.status).toBe("delayed");
    expect(envelope.value).toHaveLength(1);
    expect(envelope.value[0].open).toBe(150.0);
    expect(envelope.value[0].close).toBe(151.5);
    expect(envelope.value[0].volume).toBe(50000000);
    expect(fetchSpy).toHaveBeenCalled();
  });

  it("should return plan_restricted on candle API 401/403 access restrictions", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: "You don't have access to this resource." }),
    } as any);

    const envelope = await finnhubFreeProvider.getOhlcv({
      symbol: "AAPL",
      region: "US",
      range: "1M",
      interval: "1D",
    });

    expect(envelope.status).toBe("plan_restricted");
    expect(envelope.value).toBeNull();
  });
});
