import { ProviderId } from "../../domain/settings/provider-id";
import { ProviderSettingSnapshot } from "../../domain/settings/provider-setting-snapshot";
import { searchOpenDartDisclosures } from "../opendart/disclosure-search-client";
import { kisDomesticStockProvider } from "../providers/kis/kis-domestic-stock-provider";
import { finnhubFreeProvider } from "../providers/finnhub-free-provider";
import { getProviderSettings, updateProviderStatus } from "./provider-settings-store";
import { resolveProviderConfigSync } from "./provider-config-resolver";
import { kisConfig } from "../providers/kis/kis-config";
import { KisAuthClient } from "../providers/kis/kis-auth-client";
import { isMockKey } from "../providers/provider-registry";
import {
  evaluateKisDiagnostic,
  evaluateOpenDartDiagnostic,
  evaluateFinnhubDiagnostic,
  DiagnosticResult,
  KisDiagnosticInput,
} from "./provider-health-diagnostics";

/**
 * Classify a caught error into a safe, non-revealing category string.
 * Raw error messages are NEVER returned — they may contain credentials or
 * upstream server internals.
 */
function classifyProviderError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/401/i.test(message)) return "401";
  if (/403/i.test(message)) return "403";
  if (/429|rate.?limit/i.test(message)) return "429";
  if (/ENOTFOUND|ECONN|ETIMEDOUT|fetch failed/i.test(message)) return "network";
  return "unknown";
}

const DATA_STATUSES = new Set(["real_time", "delayed", "eod", "cached"] as const);

function isDataStatus(status: string): status is "real_time" | "delayed" | "eod" | "cached" {
  return DATA_STATUSES.has(status as "real_time" | "delayed" | "eod" | "cached");
}

/**
 * Persist a diagnostic result to the store and return the fresh snapshot.
 * Only the evaluator's safeMessage is stored — never raw upstream text.
 */
async function persist(providerId: ProviderId, result: DiagnosticResult): Promise<ProviderSettingSnapshot> {
  await updateProviderStatus(providerId, result.status, result.safeMessage);
  return getProviderSettings(providerId);
}

export async function checkProviderHealth(providerId: ProviderId): Promise<ProviderSettingSnapshot> {
  const config = resolveProviderConfigSync(providerId);
  const enabledKey = `${providerId.toUpperCase()}_ENABLED`;
  const isEnabled = config[enabledKey] === true;

  try {
    if (providerId === "kis") {
      // Build base input — evaluator decides early-exit stages
      const baseInput: KisDiagnosticInput = {
        enabled: isEnabled,
        appKey: kisConfig.appKey,
        appSecret: kisConfig.appSecret,
        isPaper: kisConfig.isPaper,
        baseUrl: kisConfig.baseUrl,
        // tokenResult and quoteResult absent = stages not yet executed
      };

      // Stage 1-3: disabled, missing credentials, endpoint mismatch
      const initial = evaluateKisDiagnostic(baseInput);
      if (initial.status !== "unverified") {
        return persist(providerId, initial);
      }

      // Stage 4: OAuth token acquisition
      let tokenResult: KisDiagnosticInput["tokenResult"];
      try {
        await KisAuthClient.getAccessToken();
        tokenResult = { success: true };
      } catch (error) {
        tokenResult = { success: false, errorMessage: classifyProviderError(error) };
      }

      const afterToken = evaluateKisDiagnostic({ ...baseInput, tokenResult });
      if (afterToken.status !== "unverified") {
        return persist(providerId, afterToken);
      }

      // Stage 5 & 6: Quote retrieval and freshness check
      const quoteRes = await kisDomesticStockProvider.getQuote("005930");
      const quoteResult: KisDiagnosticInput["quoteResult"] = isDataStatus(quoteRes.status)
        ? { status: quoteRes.status, hasValue: quoteRes.value !== null }
        : { status: quoteRes.status as "rate_limited" | "error" | "api_required" | "not_found" | "not_supported", message: null };

      return persist(providerId, evaluateKisDiagnostic({ ...baseInput, tokenResult, quoteResult }));

    } else if (providerId === "opendart") {
      const apiKey = (config["OPENDART_API_KEY"] as string) || "";
      const initial = evaluateOpenDartDiagnostic({ enabled: isEnabled, apiKey });
      if (initial.status !== "unverified") {
        return persist(providerId, initial);
      }

      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const dd = String(today.getDate()).padStart(2, "0");
      const endDateStr = `${yyyy}${mm}${dd}`;
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      const beginDateStr = `${oneMonthAgo.getFullYear()}${String(oneMonthAgo.getMonth() + 1).padStart(2, "0")}${String(oneMonthAgo.getDate()).padStart(2, "0")}`;

      const searchRes = await searchOpenDartDisclosures({
        corpCode: "00126380",
        beginDate: beginDateStr,
        endDate: endDateStr,
      });

      type OdStatus = "eod" | "real_time" | "not_found" | "rate_limited" | "api_required" | "error";
      const searchResult: Parameters<typeof evaluateOpenDartDiagnostic>[0]["searchResult"] =
        isDataStatus(searchRes.status)
          ? { status: searchRes.status as "eod" | "real_time", hasValue: searchRes.value !== null }
          : searchRes.status === "not_found"
            ? { status: "not_found" }
            : { status: searchRes.status as "rate_limited" | "api_required" | "error", message: null };

      return persist(providerId, evaluateOpenDartDiagnostic({ enabled: isEnabled, apiKey, searchResult }));

    } else if (providerId === "finnhub") {
      const apiKey = (config["FINNHUB_API_KEY"] as string) || "";
      const initial = evaluateFinnhubDiagnostic({ enabled: isEnabled, apiKey });
      if (initial.status !== "unverified") {
        return persist(providerId, initial);
      }

      const quoteRes = await finnhubFreeProvider.getQuote("AAPL");
      const quoteResult: Parameters<typeof evaluateFinnhubDiagnostic>[0]["quoteResult"] =
        isDataStatus(quoteRes.status)
          ? { status: quoteRes.status as "real_time" | "delayed" | "eod" | "cached", hasValue: quoteRes.value !== null }
          : { status: quoteRes.status as "rate_limited" | "error" | "api_required", message: null };

      return persist(providerId, evaluateFinnhubDiagnostic({ enabled: isEnabled, apiKey, quoteResult }));

    } else {
      // Generic providers: check required key presence
      const requiredKeys = getRequiredKeysForProvider(providerId);
      const hasKeys = requiredKeys.every((k) => !!config[k]);
      const result: DiagnosticResult = hasKeys
        ? { status: "healthy", safeMessage: "설정이 완료되었습니다." }
        : { status: "credentials_missing", safeMessage: "필수 설정 값이 누락되었습니다." };
      return persist(providerId, result);
    }
  } catch (err: unknown) {
    // Catch-all: never expose raw error text
    const result: DiagnosticResult = {
      status: "provider_error",
      safeMessage: "Provider 연결 테스트 중 오류가 발생했습니다.",
    };
    return persist(providerId, result);
  }
}

function getRequiredKeysForProvider(providerId: ProviderId): string[] {
  switch (providerId) {
    case "kis": return ["KIS_APP_KEY", "KIS_APP_SECRET"];
    case "fmp": return ["FMP_API_KEY"];
    case "finnhub": return ["FINNHUB_API_KEY"];
    case "alpha_vantage": return ["ALPHA_VANTAGE_API_KEY"];
    default: return [];
  }
}
