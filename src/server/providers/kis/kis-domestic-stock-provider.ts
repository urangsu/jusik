import { DataEnvelope, MarketRegion } from "@/domain/common/data-status";
import { Quote } from "@/domain/market/quote";
import { MarketDataProvider } from "../../adapters/types";
import { providerRegistry } from "../provider-registry";
import { KisHttpClient } from "./kis-http-client";
import { normalizeKisError } from "./kis-error-normalizer";
import { KisQuoteResponse, KisDailyPriceResponse } from "./kis-types";
import { kisConfig } from "./kis-config";
import { KisQuoteSchema, KisDailyItemSchema } from "../schemas/kis-market.schema";

function isKospiMarketOpen(now = new Date()): boolean {
  // KST is UTC+9
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const kst = new Date(utc + 9 * 3600000);
  const day = kst.getDay();
  if (day === 0 || day === 6) return false;
  const minutes = kst.getHours() * 60 + kst.getMinutes();
  return minutes >= 540 && minutes <= 930; // 09:00 - 15:30 KST
}

export class KisDomesticStockProvider implements MarketDataProvider {
  private providerId = "kis";

  async getQuote(symbol: string): Promise<DataEnvelope<Quote>> {
    const isEnabled = providerRegistry.isEnabled(this.providerId) && kisConfig.isConfigured;
    if (!isEnabled) {
      return {
        value: null,
        status: "api_required",
        source: "KIS Open API",
        sourceTier: "official",
        warnings: [],
        updatedAt: null,
      };
    }

    try {
      const res = await KisHttpClient.request<KisQuoteResponse>(
        "/uapi/domestic-stock/v1/quotations/inquire-price",
        "GET",
        {
          tr_id: "FHKST01010100",
        },
        {
          FID_COND_MRKT_DIV_CODE: "J",
          FID_INPUT_ISCD: symbol,
        }
      );

      const status = normalizeKisError(res.rt_cd, res.msg_cd, res.msg1);
      if (res.rt_cd !== "0" || !res.output) {
        return {
          value: null,
          status,
          source: "KIS Open API",
          sourceTier: "official",
          warnings: [],
          updatedAt: null,
          errorCode: res.msg_cd,
          message: res.msg1,
        };
      }

      const parsedOutput = KisQuoteSchema.parse(res.output);

      const price = parseFloat(parsedOutput.stck_prpr);
      const change = parseFloat(parsedOutput.prdy_vrss);
      const changePct = parseFloat(parsedOutput.prdy_ctrt);
      const volume = parseInt(parsedOutput.acml_vol, 10);

      const quoteStatus = isKospiMarketOpen() ? "real_time" : "eod";
      const nowStr = new Date().toISOString();

      const quote: Quote = {
        assetId: `KR:${symbol}`,
        market: "KR",
        symbol,
        price,
        currency: "KRW",
        change,
        changePct,
        volume: volume >= 0 ? volume : null,
        tradeDate: nowStr.split("T")[0],
        updatedAt: nowStr,
        source: "KIS Open API",
        dataVersionId: null,
      };

      return {
        value: quote,
        status: quoteStatus,
        source: "KIS Open API",
        sourceTier: "official",
        warnings: [],
        updatedAt: nowStr,
      };
    } catch (err: any) {
      return {
        value: null,
        status: "error",
        source: "KIS Open API",
        sourceTier: "official",
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
    const isEnabled = providerRegistry.isEnabled(this.providerId) && kisConfig.isConfigured;
    if (!isEnabled) {
      return {
        value: null,
        status: "api_required",
        source: "KIS Open API",
        sourceTier: "official",
        warnings: [],
        updatedAt: null,
      };
    }

    try {
      const today = new Date();
      const endStr = today.toISOString().split("T")[0].replace(/-/g, "");

      const start = new Date();
      if (params.range === "1M") start.setMonth(today.getMonth() - 1);
      else if (params.range === "3M") start.setMonth(today.getMonth() - 3);
      else if (params.range === "6M") start.setMonth(today.getMonth() - 6);
      else if (params.range === "1Y") start.setFullYear(today.getFullYear() - 1);
      else if (params.range === "3Y") start.setFullYear(today.getFullYear() - 3);
      else if (params.range === "5Y") start.setFullYear(today.getFullYear() - 5);
      else start.setFullYear(today.getFullYear() - 10);

      const startStr = start.toISOString().split("T")[0].replace(/-/g, "");

      let periodDiv = "D";
      if (params.interval === "1W") periodDiv = "W";
      if (params.interval === "1M") periodDiv = "M";

      const res = await KisHttpClient.request<KisDailyPriceResponse>(
        "/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice",
        "GET",
        {
          tr_id: "FHKST03010100",
        },
        {
          FID_COND_MRKT_DIV_CODE: "J",
          FID_INPUT_ISCD: params.symbol,
          FID_INPUT_DATE_1: startStr,
          FID_INPUT_DATE_2: endStr,
          FID_PERIOD_DIV_CODE: periodDiv,
          FID_ORG_ADPR: "Y",
        }
      );

      const status = normalizeKisError(res.rt_cd, res.msg_cd, res.msg1);
      if (res.rt_cd !== "0" || !res.output) {
        return {
          value: null,
          status,
          source: "KIS Open API",
          sourceTier: "official",
          warnings: [],
          updatedAt: null,
          errorCode: res.msg_cd,
          message: res.msg1,
        };
      }

      const candles = res.output
        .map((rawItem) => {
          const item = KisDailyItemSchema.parse(rawItem);
          return {
            date: `${item.stck_bsop_date.substring(0, 4)}-${item.stck_bsop_date.substring(4, 6)}-${item.stck_bsop_date.substring(6, 8)}`,
            open: parseFloat(item.stck_oprc),
            high: parseFloat(item.stck_hgpr),
            low: parseFloat(item.stck_lwpr),
            close: parseFloat(item.stck_clpr),
            volume: parseInt(item.acml_vol, 10),
          };
        })
        .reverse();

      return {
        value: candles,
        status: "eod",
        source: "KIS Open API",
        sourceTier: "official",
        warnings: [],
        updatedAt: new Date().toISOString(),
      };
    } catch (err: any) {
      return {
        value: null,
        status: "error",
        source: "KIS Open API",
        sourceTier: "official",
        warnings: [],
        updatedAt: null,
        message: err.message || String(err),
      };
    }
  }
}

export const kisDomesticStockProvider = new KisDomesticStockProvider();
