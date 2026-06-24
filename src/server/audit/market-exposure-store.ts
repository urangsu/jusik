import fs from "fs/promises";
import { MarketExposureResult } from "@/domain/audit/market-exposure-result";
import { writeAtomic } from "../storage/atomic-write";
import {
  getMarketExposureDir,
  getMarketExposureLatestPath,
  getMarketExposureByTrialDir,
  getMarketExposureByTrialPath,
} from "./market-exposure-store-paths";

export async function saveMarketExposureResult(
  result: MarketExposureResult
): Promise<void> {
  const dir = getMarketExposureDir();
  const trialDir = getMarketExposureByTrialDir();

  // Create directories if they do not exist
  await fs.mkdir(dir, { recursive: true });
  await fs.mkdir(trialDir, { recursive: true });

  const latestPath = getMarketExposureLatestPath();
  const trialPath = getMarketExposureByTrialPath(result.trialId);

  const serialized = JSON.stringify(result, null, 2);

  // Write atomically
  await writeAtomic(latestPath, serialized);
  await writeAtomic(trialPath, serialized);
}

export async function getMarketExposureResultByTrial(
  trialId: string
): Promise<MarketExposureResult | null> {
  const trialPath = getMarketExposureByTrialPath(trialId);

  try {
    const raw = await fs.readFile(trialPath, "utf8");
    return JSON.parse(raw) as MarketExposureResult;
  } catch (err: any) {
    if (err.code !== "ENOENT") {
      throw err;
    }
    return null;
  }
}
