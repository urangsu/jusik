import path from "path";

export function getSnapshotDir(): string {
  const envPath = process.env.MARKET_BOARD_SNAPSHOT_DIR;
  if (envPath) {
    return path.isAbsolute(envPath) ? envPath : path.join(/*turbopackIgnore: true*/ process.cwd(), envPath);
  }
  return path.join(/*turbopackIgnore: true*/ process.cwd(), "data/snapshots/market-board");
}

export function getSnapshotPath(universeId: string): string {
  return path.join(/*turbopackIgnore: true*/ getSnapshotDir(), `${universeId}.latest.json`);
}
