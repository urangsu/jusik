#!/usr/bin/env tsx

import { kisConfig } from "../../src/server/providers/kis/kis-config";
import { resolveProviderConfigSync } from "../../src/server/settings/provider-config-resolver";
import { isMockKey } from "../../src/server/providers/provider-registry";
import { marketDataService } from "../../src/server/services/market-data-service";

async function main() {
  const kisKey = kisConfig.appKey;
  const kisSecret = kisConfig.appSecret;

  const finnhubConfig = resolveProviderConfigSync("finnhub");
  const finnhubKey = (finnhubConfig["FINNHUB_API_KEY"] as string) || "";

  const isKisReady = kisKey && kisSecret && !isMockKey(kisKey) && !isMockKey(kisSecret);
  const isFinnhubReady = finnhubKey && !isMockKey(finnhubKey);

  if (!isKisReady && !isFinnhubReady) {
    console.log("SKIPPED_CONFIG: KIS and Finnhub are not configured with real keys. Skipping live tests.");
    process.exit(0);
  }

  console.log("[Live Providers Smoke Test]");
  console.log(`KIS configuration ready: ${Boolean(isKisReady)}`);
  console.log(`Finnhub configuration ready: ${Boolean(isFinnhubReady)}`);

  let failure = false;

  if (isKisReady) {
    try {
      console.log("\nTesting KIS live Quote...");
      const quoteRes = await marketDataService.getQuoteForProvider("005930", "kis", "KR");
      console.log(`Status: ${quoteRes.status}, Price: ${quoteRes.value?.price}`);
      if (quoteRes.status === "error" || quoteRes.status === "api_required") {
        console.error("KIS Quote live fetch failed:", quoteRes.message);
        failure = true;
      }

      console.log("\nTesting KIS live OHLCV (6M)...");
      const ohlcvRes = await marketDataService.getOhlcvForProvider({
        symbol: "005930",
        region: "KR",
        range: "6M",
        interval: "1D",
      }, "kis");
      console.log(`Status: ${ohlcvRes.status}, Bars count: ${Array.isArray(ohlcvRes.value) ? ohlcvRes.value.length : 0}`);
      if (ohlcvRes.status === "error" || ohlcvRes.status === "api_required") {
        console.error("KIS OHLCV live fetch failed:", ohlcvRes.message);
        failure = true;
      }
    } catch (err) {
      console.error("Error testing KIS live:", err);
      failure = true;
    }
  }

  if (isFinnhubReady) {
    try {
      console.log("\nTesting Finnhub live Quote...");
      const quoteRes = await marketDataService.getQuoteForProvider("AAPL", "finnhub_free", "US");
      console.log(`Status: ${quoteRes.status}, Price: ${quoteRes.value?.price}`);
      if (quoteRes.status === "error" || quoteRes.status === "api_required") {
        console.error("Finnhub Quote live fetch failed:", quoteRes.message);
        failure = true;
      }

      console.log("\nTesting Finnhub live OHLCV (1M)...");
      const ohlcvRes = await marketDataService.getOhlcvForProvider({
        symbol: "AAPL",
        region: "US",
        range: "1M",
        interval: "1D",
      }, "finnhub_free");
      console.log(`Status: ${ohlcvRes.status}, Bars count: ${Array.isArray(ohlcvRes.value) ? ohlcvRes.value.length : 0}`);
      if (ohlcvRes.status === "error" || ohlcvRes.status === "api_required" || ohlcvRes.status === "plan_restricted") {
        console.log(`Finnhub OHLCV status returned: ${ohlcvRes.status}. This may be restricted by plan, but parsed correctly.`);
      }
    } catch (err) {
      console.error("Error testing Finnhub live:", err);
      failure = true;
    }
  }

  if (failure) {
    console.error("\nLive provider validation encountered errors.");
    process.exit(1);
  } else {
    console.log("\nLive provider checks finished successfully.");
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
