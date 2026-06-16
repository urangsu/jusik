export class KisConfig {
  public get appKey(): string {
    return process.env.KIS_APP_KEY || "";
  }

  public get appSecret(): string {
    return process.env.KIS_APP_SECRET || "";
  }

  public get accountNo(): string {
    return process.env.KIS_ACCOUNT_NO || "";
  }

  public get appType(): "paper" | "real" {
    return (process.env.KIS_APP_TYPE as "paper" | "real") || "paper";
  }

  public get restUrl(): string {
    return process.env.KIS_REST_URL || "https://openapivts.koreainvestment.com";
  }

  public get isTradingEnabled(): boolean {
    return process.env.KIS_TRADING_ENABLED === "true";
  }

  public get isOrderRouteEnabled(): boolean {
    return process.env.KIS_ORDER_ROUTE_ENABLED === "true";
  }

  public get maxTickersPerSnapshot(): number {
    return process.env.KIS_MAX_TICKERS_PER_SNAPSHOT ? parseInt(process.env.KIS_MAX_TICKERS_PER_SNAPSHOT, 10) : 20;
  }

  public get snapshotSleepMs(): number {
    return process.env.KIS_SNAPSHOT_SLEEP_MS ? parseInt(process.env.KIS_SNAPSHOT_SLEEP_MS, 10) : 350;
  }

  public get dailyLimit(): number {
    return process.env.KIS_DAILY_LIMIT ? parseInt(process.env.KIS_DAILY_LIMIT, 10) : 500;
  }

  public get isConfigured(): boolean {
    return !!(this.appKey && this.appSecret && this.appKey !== "mock_kis_app_key");
  }
}

export const kisConfig = new KisConfig();
