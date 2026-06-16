/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from "fs/promises";
import path from "path";
import { MarketBoardSnapshot, getDefaultSnapshot } from "@/domain/market-board/market-board-snapshot";
import { KOSPI_SAMPLE_CONSTITUENTS } from "@/domain/universe/market-universe";
import { getSnapshotDir, getSnapshotPath } from "@/server/snapshots/snapshot-paths";
import { kisConfig } from "@/server/providers/kis/kis-config";
import { kisDomesticStockProvider } from "@/server/providers/kis/kis-domestic-stock-provider";
import { validateMarketBoardSnapshot } from "@/server/snapshots/snapshot-schema";

/**
 * Runs a snapshot generation job for the KOSPI_SAMPLE universe using KIS Open API.
 * Rules:
 * - Only KOSPI_SAMPLE universe allowed.
 * - Caps tickers at KIS_MAX_TICKERS_PER_SNAPSHOT (default 20).
 * - Implements delay between ticker requests KIS_SNAPSHOT_SLEEP_MS (default 350ms).
 * - Captures individual failures in failures.latest.json without failing the whole snapshot.
 */
export async function runKisSnapshotJob(
  universeId: string
): Promise<{ success: boolean; failures: string[] }> {
  if (universeId !== "KOSPI_SAMPLE") {
    throw new Error(`Job rejected: Universe ${universeId} is not supported. Only KOSPI_SAMPLE is allowed.`);
  }

  const maxTickers = kisConfig.maxTickersPerSnapshot;
  const sleepMs = kisConfig.snapshotSleepMs;

  const constituents = KOSPI_SAMPLE_CONSTITUENTS.slice(0, maxTickers);
  const failures: string[] = [];
  
  const defaultSnapshot = getDefaultSnapshot("KOSPI_SAMPLE");
  const now = new Date().toISOString();

  const tiles = [...defaultSnapshot.tiles];
  const tableRows = [...defaultSnapshot.tableRows];

  for (let i = 0; i < constituents.length; i++) {
    const c = constituents[i];
    
    // Throttle to respect KIS API rate limits
    if (i > 0 && sleepMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, sleepMs));
    }

    try {
      const quoteEnvelope = await kisDomesticStockProvider.getQuote(c.symbol);
      const ohlcvEnvelope = await kisDomesticStockProvider.getOhlcv({
        symbol: c.symbol,
        region: "KR",
        range: "1Y",
        interval: "1D",
      });

      if (
        quoteEnvelope.status === "error" ||
        quoteEnvelope.status === "api_required" ||
        !quoteEnvelope.value
      ) {
        throw new Error(`Quote request failed with status: ${quoteEnvelope.status}`);
      }

      const quote = quoteEnvelope.value;
      const candles = ohlcvEnvelope.value || [];

      // Calculate 52-week high percent and interval returns from historical candles
      let high52WeekPercent: number | null = null;
      let return20Day: number | null = null;
      let return60Day: number | null = null;

      if (candles.length > 0) {
        const prices = candles.map((cand: any) => cand.close);
        const currentPrice = quote.price || prices[prices.length - 1];

        // 52-week high (approx 250 trading days)
        const yearCandles = candles.slice(-250);
        const highs = yearCandles.map((cand: any) => cand.high);
        const high52 = Math.max(...highs, currentPrice);
        high52WeekPercent = ((currentPrice - high52) / high52) * 100;

        // 20 trading day return
        if (candles.length >= 21) {
          const price20Ago = candles[candles.length - 21].close;
          return20Day = ((currentPrice - price20Ago) / price20Ago) * 100;
        }

        // 60 trading day return
        if (candles.length >= 61) {
          const price60Ago = candles[candles.length - 61].close;
          return60Day = ((currentPrice - price60Ago) / price60Ago) * 100;
        }
      }

      // Update Tile element
      const tileIdx = tiles.findIndex((t) => t.symbol === c.symbol);
      if (tileIdx !== -1) {
        tiles[tileIdx] = {
          ...tiles[tileIdx],
          price: quote.price,
          changePercent: quote.changePct,
          volume: quote.volume,
          dataStatus: quoteEnvelope.status,
          source: "KIS Open API",
          sourceTier: "official",
          warnings: [],
          updatedAt: now,
        };
      }

      // Update TableRow element
      const rowIdx = tableRows.findIndex((r) => r.symbol === c.symbol);
      if (rowIdx !== -1) {
        tableRows[rowIdx] = {
          ...tableRows[rowIdx],
          price: quote.price,
          changePercent: quote.changePct,
          volume: quote.volume,
          turnover: quote.price && quote.volume ? quote.price * quote.volume : null,
          high52WeekPercent,
          return20Day,
          return60Day,
          dataStatus: quoteEnvelope.status,
          source: "KIS Open API",
          sourceTier: "official",
          warnings: [],
          updatedAt: now,
        };
      }
    } catch (err: any) {
      console.error(`KIS snapshot job ticker ${c.symbol} failed: ${err.message}`);
      failures.push(c.symbol);

      // Flag failure status on elements instead of removing them
      const tileIdx = tiles.findIndex((t) => t.symbol === c.symbol);
      if (tileIdx !== -1) {
        tiles[tileIdx] = {
          ...tiles[tileIdx],
          dataStatus: "error",
          updatedAt: now,
        };
      }
      const rowIdx = tableRows.findIndex((r) => r.symbol === c.symbol);
      if (rowIdx !== -1) {
        tableRows[rowIdx] = {
          ...tableRows[rowIdx],
          dataStatus: "error",
          updatedAt: now,
        };
      }
    }
  }

  // Construct source summaries
  const kisSourceSummary = {
    providerId: "kis",
    displayName: "KIS Open API",
    tier: "official" as const,
    status:
      failures.length === constituents.length
        ? ("error" as const)
        : failures.length > 0
        ? ("degraded" as const)
        : ("healthy" as const),
    used: constituents.length,
    limit: kisConfig.dailyLimit,
    warnings: [],
    enabled: true,
  };

  const updatedSourceSummary = [
    kisSourceSummary,
    ...defaultSnapshot.sourceSummary.filter((s) => s.providerId !== "kis"),
  ];

  const snapshot: MarketBoardSnapshot = {
    universeId: "KOSPI_SAMPLE",
    generatedAt: now,
    sourceSummary: updatedSourceSummary,
    tiles,
    tableRows,
    missingData: failures.map((f) => {
      const name = constituents.find((c) => c.symbol === f)?.nameKo || f;
      return { symbol: f, name, missingFields: ["price", "changePercent", "ohlcv"] };
    }),
    warnings:
      failures.length > 0
        ? [`일부 종목(${failures.join(", ")})의 KIS 시세 데이터 수집에 실패했습니다.`]
        : [],
  };

  const snapshotDir = getSnapshotDir();
  await fs.mkdir(snapshotDir, { recursive: true });

  // Validate and write snapshot
  if (validateMarketBoardSnapshot(snapshot)) {
    const filePath = getSnapshotPath("KOSPI_SAMPLE");
    await fs.writeFile(filePath, JSON.stringify(snapshot, null, 2), "utf-8");
  } else {
    throw new Error("Generated snapshot failed verification against MarketBoardSnapshot schema.");
  }

  // Save list of failures
  const failuresPath = path.join(snapshotDir, "failures.latest.json");
  await fs.writeFile(
    failuresPath,
    JSON.stringify({ failures, timestamp: now }, null, 2),
    "utf-8"
  );

  return {
    success: failures.length < constituents.length,
    failures,
  };
}
