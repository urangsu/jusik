import path from "path";

export function getMarketExposureDir(): string {
  return path.join(process.cwd(), "data", "audits", "market-exposure");
}

export function getMarketExposureLatestPath(): string {
  return path.join(getMarketExposureDir(), "latest.json");
}

export function getMarketExposureByTrialDir(): string {
  return path.join(getMarketExposureDir(), "by-trial");
}

export function getMarketExposureByTrialPath(trialId: string): string {
  return path.join(getMarketExposureByTrialDir(), `${trialId}.json`);
}
