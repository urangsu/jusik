import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { KisDomesticStockProvider } from "./kis-domestic-stock-provider";
import { KisHttpClient } from "./kis-http-client";
import { providerRegistry } from "../provider-registry";
import { kisConfig } from "./kis-config";

describe("KIS Domestic Stock Provider Checks", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.KIS_APP_KEY = "test_app_key";
    process.env.KIS_APP_SECRET = "test_app_secret";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("should retrieve a normalized quote when API succeeds", async () => {
    vi.spyOn(providerRegistry, "isEnabled").mockReturnValue(true);
    vi.spyOn(kisConfig, "isConfigured", "get").mockReturnValue(true);

    const requestSpy = vi.spyOn(KisHttpClient, "request").mockResolvedValue({
      rt_cd: "0",
      msg_cd: "OPS00000",
      msg1: "성공",
      output: {
        stck_prpr: "75000",
        prdy_vrss: "1200",
        prdy_ctrt: "1.63",
        acml_vol: "12000000",
        hts_kor_alph_usr_nm: "삼성전자",
      },
    });

    const provider = new KisDomesticStockProvider();
    const envelope = await provider.getQuote("005930");

    expect(envelope.status).toBe("real_time");
    expect(envelope.value).not.toBeNull();
    expect(envelope.value?.price).toBe(75000);
    expect(envelope.value?.changePct).toBe(1.63);
    expect(envelope.value?.volume).toBe(12000000);
    expect(requestSpy).toHaveBeenCalled();
  });
});
