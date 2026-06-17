import { resolveProviderConfigSync } from "../../settings/provider-config-resolver";

export class KisConfig {
  private get config() {
    return resolveProviderConfigSync("kis");
  }

  public get appKey(): string {
    return (this.config["KIS_APP_KEY"] as string) || "";
  }

  public get appSecret(): string {
    return (this.config["KIS_APP_SECRET"] as string) || "";
  }

  public get accountNo(): string {
    return (this.config["KIS_ACCOUNT_NO"] as string) || "";
  }

  public get appType(): "paper" | "real" {
    if (process.env.KIS_APP_TYPE === "real") {
      return "real";
    }
    if (process.env.KIS_APP_TYPE === "paper") {
      return "paper";
    }
    const isPaper = this.config["KIS_IS_PAPER"] !== false;
    return isPaper ? "paper" : "real";
  }

  public get restUrl(): string {
    return (this.config["KIS_BASE_URL"] as string) || "https://openapivts.koreainvestment.com";
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
