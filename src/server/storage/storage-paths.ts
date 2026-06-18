import path from "path";

export function getDataDir(): string {
  return path.join(/*turbopackIgnore: true*/ process.cwd(), "data");
}

export function getOhlcvHistoryDir(universeId: string): string {
  return path.join(getDataDir(), "market/ohlcv", universeId);
}

export function getOhlcvHistoryPath(universeId: string, assetId: string): string {
  const safeAssetId = assetId.replace(/:/g, "_");
  return path.join(getOhlcvHistoryDir(universeId), `${safeAssetId}.json`);
}

export function getFactorValuesPath(): string {
  return path.join(getDataDir(), "factors/factor-values.json");
}

export function getTechnicalSignalSnapshotPath(universeId: string): string {
  return path.join(getDataDir(), "factors/technical", `${universeId}.latest.json`);
}

export function getSignalHistoryPath(): string {
  return path.join(getDataDir(), "signals/signal-history.json");
}

export function getCurrentSignalsPath(): string {
  return path.join(getDataDir(), "signals/current-signals.json");
}

export function getStrategyTrialsPath(): string {
  return path.join(getDataDir(), "strategy-trials/events.json");
}

export function getStrategyTrialsLatestPath(): string {
  return path.join(getDataDir(), "strategy-trials/latest.json");
}
