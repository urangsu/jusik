import { ProviderId } from "../../domain/settings/provider-id";
import { ProviderSettingSnapshot } from "../../domain/settings/provider-setting-snapshot";
import { searchOpenDartDisclosures } from "../opendart/disclosure-search-client";
import { kisDomesticStockProvider } from "../providers/kis/kis-domestic-stock-provider";
import { finnhubFreeProvider } from "../providers/finnhub-free-provider";
import { getProviderSettings, updateProviderStatus } from "./provider-settings-store";
import { resolveProviderConfigSync } from "./provider-config-resolver";

export async function checkProviderHealth(providerId: ProviderId): Promise<ProviderSettingSnapshot> {
  const snapshot = await getProviderSettings(providerId);
  const config = resolveProviderConfigSync(providerId);
  const enabledKey = `${providerId.toUpperCase()}_ENABLED`;
  const isEnabled = config[enabledKey] === true;

  if (!isEnabled) {
    await updateProviderStatus(providerId, "not_configured", "Provider가 비활성화되어 있습니다.");
    return getProviderSettings(providerId);
  }

  let status: ProviderSettingSnapshot["status"] = "healthy";
  let message: string | null = null;

  try {
    if (providerId === "opendart") {
      const apiKey = config["OPENDART_API_KEY"] as string;
      if (!apiKey) {
        status = "not_configured";
        message = "API Key가 설정되지 않았습니다.";
      } else {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, "0");
        const dd = String(today.getDate()).padStart(2, "0");
        const endDateStr = `${yyyy}${mm}${dd}`;

        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        const byyyy = oneMonthAgo.getFullYear();
        const bmm = String(oneMonthAgo.getMonth() + 1).padStart(2, "0");
        const bdd = String(oneMonthAgo.getDate()).padStart(2, "0");
        const beginDateStr = `${byyyy}${bmm}${bdd}`;

        const searchRes = await searchOpenDartDisclosures({
          corpCode: "00126380",
          beginDate: beginDateStr,
          endDate: endDateStr,
        });

        if (searchRes.status === "eod" || searchRes.status === "not_found" || searchRes.value !== null) {
          status = "healthy";
          message = "정상적으로 연결되었습니다.";
        } else if (searchRes.status === "rate_limited") {
          status = "rate_limited";
          message = searchRes.message || "요청 한도를 초과했습니다.";
        } else if (searchRes.status === "api_required") {
          status = "not_configured";
          message = "API Key 설정이 필요합니다.";
        } else {
          const errMsg = searchRes.message || "";
          if (
            errMsg.includes("인증") ||
            errMsg.includes("Key") ||
            errMsg.includes("키") ||
            errMsg.includes("010") ||
            errMsg.includes("011")
          ) {
            status = "invalid_key";
            message = "유효하지 않은 API Key입니다.";
          } else {
            status = "error";
            message = errMsg || "OpenDART 연결 중 오류가 발생했습니다.";
          }
        }
      }
    } else if (providerId === "kis") {
      const appKey = config["KIS_APP_KEY"] as string;
      const appSecret = config["KIS_APP_SECRET"] as string;

      if (!appKey || !appSecret) {
        status = "not_configured";
        message = "KIS App Key 또는 Secret이 누락되었습니다.";
      } else {
        const quoteRes = await kisDomesticStockProvider.getQuote("005930");
        if (quoteRes.value !== null && ["real_time", "delayed", "eod", "cached"].includes(quoteRes.status)) {
          status = "healthy";
          message = "KIS Open API 시세 조회가 성공했습니다.";
        } else if (quoteRes.status === "api_required") {
          status = "not_configured";
          message = quoteRes.message || "KIS API 자격 증명이 필요합니다.";
        } else if (quoteRes.status === "rate_limited") {
          status = "rate_limited";
          message = quoteRes.message || "KIS 요청 한도를 초과했습니다.";
        } else {
          const errMsg = quoteRes.message || "";
          if (
            errMsg.includes("인증") ||
            errMsg.includes("Key") ||
            errMsg.includes("키") ||
            errMsg.includes("APPKEY") ||
            errMsg.includes("401") ||
            errMsg.includes("403")
          ) {
            status = "invalid_key";
            message = "유효하지 않은 KIS 자격증명입니다.";
          } else {
            status = "error";
            message = errMsg || "KIS 연결 실패.";
          }
        }
      }
    } else if (providerId === "finnhub") {
      const apiKey = config["FINNHUB_API_KEY"] as string;
      if (!apiKey) {
        status = "not_configured";
        message = "Finnhub API Key가 누락되었습니다.";
      } else {
        const quoteRes = await finnhubFreeProvider.getQuote("AAPL");
        if (quoteRes.value !== null && ["real_time", "delayed", "eod", "cached"].includes(quoteRes.status)) {
          status = "healthy";
          message = "Finnhub 시세 조회가 성공했습니다.";
        } else if (quoteRes.status === "api_required") {
          status = "not_configured";
          message = quoteRes.message || "Finnhub API Key가 필요합니다.";
        } else if (quoteRes.status === "rate_limited") {
          status = "rate_limited";
          message = quoteRes.message || "Finnhub rate limit 초과.";
        } else {
          status = "invalid_key";
          message = quoteRes.message || "유효하지 않은 Finnhub API Key입니다.";
        }
      }
    } else {
      const requiredKeys = getRequiredKeysForProvider(providerId);
      const hasKeys = requiredKeys.every((k) => !!config[k]);

      if (hasKeys) {
        status = "healthy";
        message = "설정이 완료되었습니다. (연결 테스트 정상)";
      } else {
        status = "not_configured";
        message = "필수 설정 값이 누락되었습니다.";
      }
    }
  } catch (err: any) {
    status = "error";
    message = err?.message || String(err);
  }

  await updateProviderStatus(providerId, status, message);
  return getProviderSettings(providerId);
}

function getRequiredKeysForProvider(providerId: ProviderId): string[] {
  switch (providerId) {
    case "kis":
      return ["KIS_APP_KEY", "KIS_APP_SECRET"];
    case "fmp":
      return ["FMP_API_KEY"];
    case "finnhub":
      return ["FINNHUB_API_KEY"];
    case "alpha_vantage":
      return ["ALPHA_VANTAGE_API_KEY"];
    case "telegram":
      return ["TELEGRAM_BOT_TOKEN"];
    case "email":
      return ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD", "EMAIL_FROM"];
    case "llm":
      return ["OPENAI_API_KEY"];
    default:
      return [];
  }
}
