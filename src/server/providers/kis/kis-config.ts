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
    if (process.env.KIS_APP_TYPE === "real") return false;
    if (process.env.KIS_APP_TYPE === "paper") return true;

    const envVal = process.env.KIS_IS_PAPER;
    const confVal = this.config["KIS_IS_PAPER"];
    const targetVal = envVal !== undefined ? envVal : confVal;

    if (targetVal === "false" || targetVal === false) {
      return false;
    }
    return true; // Default to paper mode
  }

  public get appType(): "paper" | "real" {
    if (process.env.KIS_APP_TYPE === "real" || process.env.KIS_APP_TYPE === "paper") {
      return process.env.KIS_APP_TYPE;
    }
    return this.isPaper ? "paper" : "real";
  }

  /**
   * P0 SECURITY FIX: baseUrl is ALWAYS derived from isPaper.
   *
   * KIS_BASE_URL (env or config) is intentionally ignored.
   *
   * Allowing arbitrary URLs was an App Key/Secret exfiltration attack surface:
   *   1. Attacker sets KIS_BASE_URL to a malicious host
   *   2. Unauthenticated health-check is triggered
   *   3. kis-auth-client POSTs /oauth2/tokenP with appKey + appSecret to attacker
   *   4. Credentials are stolen
   *
   * The only valid origins are the two official KIS endpoints.
   * Test mock proxies must use dependency injection (not env vars).
   */
  public get baseUrl(): string {
    const officialPaperUrl = "https://openapivts.koreainvestment.com:29443";
    const officialRealUrl = "https://openapi.koreainvestment.com:9443";
    return this.isPaper ? officialPaperUrl : officialRealUrl;
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
