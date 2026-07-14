import { DataEnvelope, MarketRegion } from "@/domain/common/data-status";
import { Quote } from "@/domain/market/quote";
import { providerRegistry } from "./provider-registry";
import { providerBudgetManager } from "./provider-budget-manager";
import { MarketDataProvider } from "../adapters/types";
import { resolveProviderConfigSync } from "../settings/provider-config-resolver";

export class FinnhubFreeProvider implements MarketDataProvider {
  private providerId = "finnhub_free";

  async getQuote(symbol: string): Promise<DataEnvelope<Quote>> {
    if (!providerRegistry.isEnabled(this.providerId)) {
      return {
        value: null,
        status: "api_required",
        source: "Finnhub Free",
        sourceTier: "free_limited",
        warnings: [],
        updatedAt: null,
        message: "Finnhub API Key가 설정되지 않았습니다.",
      };
    }

    if (!providerBudgetManager.consume(this.providerId)) {
      return {
        value: null,
        status: "rate_limited",
        source: "Finnhub Free",
        sourceTier: "free_limited",
        warnings: [],
        updatedAt: null,
      };
    }

    try {
      const config = resolveProviderConfigSync("finnhub");
      const apiKey = (config["FINNHUB_API_KEY"] as string) || "";
      if (!apiKey) {
        return {
          value: null,
          status: "api_required",
          source: "Finnhub Free",
          sourceTier: "free_limited",
          warnings: [],
          updatedAt: null,
          message: "Finnhub API Key가 설정되지 않았습니다.",
        };
      }

      const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`);
      if (res.status === 403 || res.status === 401) {
        const errorJson = await res.json().catch(() => ({}));
        const errMsg = errorJson.error || "Access denied or plan restricted";
        return {
          value: null,
          status: "plan_restricted",
          source: "Finnhub Free",
          sourceTier: "free_limited",
          warnings: ["plan_restricted"],
          updatedAt: new Date().toISOString(),
          message: errMsg,
        };
      }
      if (!res.ok) {
        throw new Error(`Finnhub request failed: status ${res.status}`);
      }

      const data = await res.json();
      if (data.c === 0 && data.pc === 0) {
        return {
          value: null,
          status: "not_found",
          source: "Finnhub Free",
          sourceTier: "free_limited",
          warnings: [],
          updatedAt: new Date().toISOString(),
          message: `Symbol '${symbol}' not found on Finnhub.`,
        };
      }

      const quote: Quote = {
        assetId: `US:${symbol}`,
        market: "US",
        symbol,
        price: data.c,
        currency: "USD",
        change: data.d,
        changePct: data.dp,
        volume: 0,
        tradeDate: new Date(data.t * 1000).toISOString().split("T")[0],
        updatedAt: new Date().toISOString(),
        source: "Finnhub Free",
        dataVersionId: null,
      };

      return {
        value: quote,
        status: "delayed",
        source: "Finnhub Free",
        sourceTier: "free_limited",
        warnings: [],
        updatedAt: new Date().toISOString(),
      };
    } catch (err: any) {
      return {
        value: null,
        status: "error",
        source: "Finnhub Free",
        sourceTier: "free_limited",
        warnings: [],
        updatedAt: null,
        message: err.message || String(err),
      };
    }
  }

  async getOhlcv(params: {
    symbol: string;
    region: MarketRegion;
    range: "1M" | "3M" | "6M" | "1Y" | "3Y" | "5Y" | "10Y";
    interval: "1D" | "1W" | "1M";
  }): Promise<DataEnvelope<any>> {
    if (!providerRegistry.isEnabled(this.providerId)) {
      return {
        value: null,
        status: "api_required",
        source: "Finnhub Free",
        sourceTier: "free_limited",
        warnings: [],
        updatedAt: null,
      };
    }

    if (!providerBudgetManager.consume(this.providerId)) {
      return {
        value: null,
        status: "rate_limited",
        source: "Finnhub Free",
        sourceTier: "free_limited",
        warnings: [],
        updatedAt: null,
      };
    }

    try {
      const config = resolveProviderConfigSync("finnhub");
      const apiKey = (config["FINNHUB_API_KEY"] as string) || "";
      if (!apiKey) {
        return {
          value: null,
          status: "api_required",
          source: "Finnhub Free",
          sourceTier: "free_limited",
          warnings: [],
          updatedAt: null,
        };
      }

      const today = new Date();
      const endTimestamp = Math.floor(today.getTime() / 1000);

      const start = new Date();
      if (params.range === "1M") start.setMonth(today.getMonth() - 1);
      else if (params.range === "3M") start.setMonth(today.getMonth() - 3);
      else if (params.range === "6M") start.setMonth(today.getMonth() - 6);
      else if (params.range === "1Y") start.setFullYear(today.getFullYear() - 1);
      else if (params.range === "3Y") start.setFullYear(today.getFullYear() - 3);
      else if (params.range === "5Y") start.setFullYear(today.getFullYear() - 5);
      else start.setFullYear(today.getFullYear() - 10);

      const startTimestamp = Math.floor(start.getTime() / 1000);

      let resolution = "D";
      if (params.interval === "1W") resolution = "W";
      if (params.interval === "1M") resolution = "M";

      const url = `https://finnhub.io/api/v1/stock/candle?symbol=${params.symbol}&resolution=${resolution}&from=${startTimestamp}&to=${endTimestamp}&token=${apiKey}`;
      const res = await fetch(url);
      if (res.status === 403 || res.status === 401) {
        const errorJson = await res.json().catch(() => ({}));
        const errMsg = errorJson.error || "Access denied or plan restricted";
        return {
          value: null,
          status: "plan_restricted",
          source: "Finnhub Free",
          sourceTier: "free_limited",
          warnings: ["plan_restricted"],
          updatedAt: new Date().toISOString(),
          message: errMsg,
        };
      }
      if (!res.ok) {
        throw new Error(`Finnhub candle request failed: status ${res.status}`);
      }

      const data = await res.json();
      if (data.s !== "ok") {
        return {
          value: null,
          status: "not_found",
          source: "Finnhub Free",
          sourceTier: "free_limited",
          warnings: [],
          updatedAt: new Date().toISOString(),
        };
      }

      const candles = data.t.map((timestamp: number, i: number) => ({
        date: new Date(timestamp * 1000).toISOString().split("T")[0],
        open: data.o[i],
        high: data.h[i],
        low: data.l[i],
        close: data.c[i],
        volume: data.v[i],
      }));

      return {
        value: candles,
        status: "delayed",
        source: "Finnhub Free",
        sourceTier: "free_limited",
        warnings: [],
        updatedAt: new Date().toISOString(),
      };
    } catch (err: any) {
      return {
        value: null,
        status: "error",
        source: "Finnhub Free",
        sourceTier: "free_limited",
        warnings: [],
        updatedAt: null,
        message: err.message || String(err),
      };
    }
  }
}

export const finnhubFreeProvider = new FinnhubFreeProvider();
