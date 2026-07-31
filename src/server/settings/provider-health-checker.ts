import { ProviderId } from "../../domain/settings/provider-id";
import { ProviderSettingSnapshot, ProviderStatus } from "../../domain/settings/provider-setting-snapshot";
import { searchOpenDartDisclosures } from "../opendart/disclosure-search-client";
import { kisDomesticStockProvider } from "../providers/kis/kis-domestic-stock-provider";
import { finnhubFreeProvider } from "../providers/finnhub-free-provider";
import { getProviderSettings, updateProviderStatus } from "./provider-settings-store";
import { resolveProviderConfigSync } from "./provider-config-resolver";
import { kisConfig } from "../providers/kis/kis-config";
import { KisAuthClient } from "../providers/kis/kis-auth-client";
import { isMockKey } from "../providers/provider-registry";

export async function checkProviderHealth(providerId: ProviderId): Promise<ProviderSettingSnapshot> {
  const config = resolveProviderConfigSync(providerId);
  const enabledKey = `${providerId.toUpperCase()}_ENABLED`;
  const isEnabled = config[enabledKey] === true;

  if (!isEnabled) {
    const msg = `${providerId.toUpperCase()} API가 비활성화되어 있습니다.`;
    await updateProviderStatus(providerId, "disabled", msg);
    return getProviderSettings(providerId);
  }

  let status: ProviderStatus = "healthy";
  let message: string | null = null;

  try {
    if (providerId === "kis") {
      const appKey = kisConfig.appKey;
      const appSecret = kisConfig.appSecret;

      // Stage 2: App Key & App Secret presence & non-placeholder check
      if (!appKey || !appSecret) {
        status = "credentials_missing";
        message = "App Key 또는 App Secret이 저장되지 않았습니다.";
      } else if (isMockKey(appKey) || isMockKey(appSecret)) {
        status = "credentials_invalid";
        message = "유효한 App Key와 App Secret을 입력해주세요 (placeholder 키 사용 불가).";
      } else {
        // Stage 3: Endpoint URL & mandatory port verification
        const baseUrl = kisConfig.baseUrl;
        const isPaper = kisConfig.isPaper;

        if (isPaper && !baseUrl.includes(":29443")) {
          status = "endpoint_mismatch";
          message = "모의투자 URL에 :29443 포트가 필요합니다.";
        } else if (!isPaper && !baseUrl.includes(":9443")) {
          status = "endpoint_mismatch";
          message = "실전투자 URL에 :9443 포트가 필요합니다.";
        } else {
          // Stage 4: OAuth Token acquisition test
          let tokenSuccess = false;
          let tokenErrMsg = "";
          try {
            await KisAuthClient.getAccessToken();
            tokenSuccess = true;
          } catch (tokenErr: any) {
            tokenErrMsg = tokenErr?.message || String(tokenErr);
          }

          if (!tokenSuccess) {
            if (
              tokenErrMsg.includes("401") ||
              tokenErrMsg.includes("403") ||
              tokenErrMsg.includes("APPKEY") ||
              tokenErrMsg.includes("invalid") ||
              tokenErrMsg.includes("인증")
            ) {
              status = "credentials_invalid";
              message = "KIS가 App Key 또는 App Secret을 거부했습니다.";
            } else {
              status = "token_failed";
              message = `토큰 발급 실패: ${tokenErrMsg}`;
            }
          } else {
            // Stage 5 & 6: Quote retrieval & freshness test
            const quoteRes = await kisDomesticStockProvider.getQuote("005930");
            if (quoteRes.value !== null && ["real_time", "delayed", "eod", "cached"].includes(quoteRes.status)) {
              status = "healthy";
              message = "KIS Open API 시세 연결 및 인증 테스트 성공";
            } else if (quoteRes.status === "rate_limited") {
              status = "rate_limited";
              message = quoteRes.message || "KIS API 호출 한도를 초과했습니다.";
            } else {
              const errMsg = quoteRes.message || "";
              if (
                errMsg.includes("인증") ||
                errMsg.includes("APPKEY") ||
                errMsg.includes("401") ||
                errMsg.includes("403")
              ) {
                status = "credentials_invalid";
                message = "KIS가 App Key 또는 App Secret을 거부했습니다.";
              } else {
                status = "provider_error";
                message = `토큰 발급은 성공했지만 시세 조회가 실패했습니다: ${errMsg || "시세 응답 없음"}`;
              }
            }
          }
        }
      }
    } else if (providerId === "opendart") {
      const apiKey = (config["OPENDART_API_KEY"] as string) || "";
      if (!apiKey) {
        status = "credentials_missing";
        message = "OpenDART API Key가 설정되지 않았습니다.";
      } else if (isMockKey(apiKey)) {
        status = "credentials_invalid";
        message = "유효한 OpenDART API Key를 입력해주세요 (placeholder 키 사용 불가).";
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
          message = "OpenDART 전자공시 시스템 정상적으로 연결되었습니다.";
        } else if (searchRes.status === "rate_limited") {
          status = "rate_limited";
          message = searchRes.message || "OpenDART 요청 한도를 초과했습니다.";
        } else if (searchRes.status === "api_required") {
          status = "credentials_missing";
          message = "OpenDART API Key 설정이 필요합니다.";
        } else {
          const errMsg = searchRes.message || "";
          if (
            errMsg.includes("인증") ||
            errMsg.includes("Key") ||
            errMsg.includes("010") ||
            errMsg.includes("011")
          ) {
            status = "credentials_invalid";
            message = "OpenDART API Key가 거부되었습니다.";
          } else {
            status = "provider_error";
            message = errMsg || "OpenDART 연결 중 오류가 발생했습니다.";
          }
        }
      }
    } else if (providerId === "finnhub") {
      const apiKey = (config["FINNHUB_API_KEY"] as string) || "";
      if (!apiKey) {
        status = "credentials_missing";
        message = "Finnhub API Key가 누락되었습니다.";
      } else if (isMockKey(apiKey)) {
        status = "credentials_invalid";
        message = "유효한 Finnhub API Key를 입력해주세요.";
      } else {
        const quoteRes = await finnhubFreeProvider.getQuote("AAPL");
        if (quoteRes.value !== null && ["real_time", "delayed", "eod", "cached"].includes(quoteRes.status)) {
          status = "healthy";
          message = "Finnhub 시세 조회가 성공했습니다.";
        } else if (quoteRes.status === "rate_limited") {
          status = "rate_limited";
          message = quoteRes.message || "Finnhub rate limit 초과.";
        } else {
          status = "credentials_invalid";
          message = quoteRes.message || "Finnhub API Key가 거부되었습니다.";
        }
      }
    } else {
      const requiredKeys = getRequiredKeysForProvider(providerId);
      const hasKeys = requiredKeys.every((k) => !!config[k]);

      if (hasKeys) {
        status = "healthy";
        message = "설정이 완료되었습니다.";
      } else {
        status = "credentials_missing";
        message = "필수 설정 값이 누락되었습니다.";
      }
    }
  } catch (err: any) {
    status = "provider_error";
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
