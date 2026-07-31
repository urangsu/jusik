import { resolveProviderConfigSync } from "../../settings/provider-config-resolver";
import { isMockKey } from "../provider-registry";

export class KisConfig {
  private get config() {
    return resolveProviderConfigSync("kis") || {};
  }

  public get appKey(): string {
    const envVal = process.env.KIS_APP_KEY;
    if (envVal) return envVal.trim();
    const confVal = this.config["KIS_APP_KEY"];
    return typeof confVal === "string" ? confVal.trim() : "";
  }

  public get appSecret(): string {
    const envVal = process.env.KIS_APP_SECRET;
    if (envVal) return envVal.trim();
    const confVal = this.config["KIS_APP_SECRET"];
    return typeof confVal === "string" ? confVal.trim() : "";
  }

  public get accountNo(): string {
    const envVal = process.env.KIS_ACCOUNT_NO;
    if (envVal) return envVal.trim();
    const confVal = this.config["KIS_ACCOUNT_NO"];
    return typeof confVal === "string" ? confVal.trim() : "";
  }

  public get accountProductCode(): string {
    const envVal = process.env.KIS_ACCOUNT_PRODUCT_CODE;
    if (envVal) return envVal.trim();
    const confVal = this.config["KIS_ACCOUNT_PRODUCT_CODE"];
    return typeof confVal === "string" ? confVal.trim() : "01";
  }

  public get isPaper(): boolean {
    const envVal = process.env.KIS_IS_PAPER;
    const confVal = this.config["KIS_IS_PAPER"];
    const targetVal = envVal !== undefined ? envVal : confVal;

    if (targetVal === "false" || targetVal === false) {
      return false;
    }
    return true; // Default to paper mode
  }

  public get appType(): "paper" | "real" {
    return this.isPaper ? "paper" : "real";
  }

  public get baseUrl(): string {
    const officialPaperUrl = "https://openapivts.koreainvestment.com:29443";
    const officialRealUrl = "https://openapi.koreainvestment.com:9443";

    const rawUrl = ((this.config["KIS_BASE_URL"] as string) || process.env.KIS_BASE_URL || "").trim();

    if (
      !rawUrl ||
      rawUrl.includes("openapivts.koreainvestment.com") ||
      rawUrl.includes("openapi.koreainvestment.com")
    ) {
      return this.isPaper ? officialPaperUrl : officialRealUrl;
    }

    // Custom third-party / mock proxy URL
    return rawUrl;
  }

  public get restUrl(): string {
    return this.baseUrl;
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
    return !!(
      this.appKey &&
      this.appSecret &&
      !isMockKey(this.appKey) &&
      !isMockKey(this.appSecret)
    );
  }
}

export const kisConfig = new KisConfig();
