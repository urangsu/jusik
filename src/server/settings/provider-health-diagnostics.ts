import { ProviderStatus } from "../../domain/settings/provider-setting-snapshot";
import { isMockKey } from "../providers/provider-registry";

export type DiagnosticResult = {
  status: ProviderStatus;
  safeMessage: string;
};

// ── Canonical KIS origins (exact URL.origin match only) ────────────────────
const KIS_PAPER_ORIGIN = "https://openapivts.koreainvestment.com:29443";
const KIS_LIVE_ORIGIN = "https://openapi.koreainvestment.com:9443";

/**
 * Returns true only when baseUrl's origin equals the expected KIS origin exactly.
 * A port-only or substring match is insufficient — attacker.example:29443 is rejected.
 */
function isExpectedKisOrigin(baseUrl: string, isPaper: boolean): boolean {
  try {
    return new URL(baseUrl).origin === (isPaper ? KIS_PAPER_ORIGIN : KIS_LIVE_ORIGIN);
  } catch {
    return false;
  }
}

// ── Stage result types (all optional — absent = stage not yet run) ──────────

export type KisTokenResult =
  | { success: true }
  | { success: false; errorMessage: string };

export type KisQuoteResult =
  | { status: "real_time" | "delayed" | "eod" | "cached"; hasValue: boolean }
  | { status: "rate_limited"; message: string | null }
  | { status: "error" | "api_required" | "not_found" | "not_supported"; message: string | null };

export type OpenDartSearchResult =
  | { status: "eod" | "real_time"; hasValue: boolean }
  | { status: "not_found"; hasValue?: boolean }
  | { status: "rate_limited"; message: string | null }
  | { status: "api_required" | "error"; message: string | null };

export type FinnhubQuoteResult =
  | { status: "real_time" | "delayed" | "eod" | "cached"; hasValue: boolean }
  | { status: "rate_limited"; message: string | null }
  | { status: "error" | "api_required"; message: string | null };

export type KisDiagnosticInput = {
  enabled: boolean;
  appKey: string;
  appSecret: string;
  isPaper: boolean;
  baseUrl: string;
  /** absent = token stage not yet executed */
  tokenResult?: KisTokenResult;
  /** absent = quote stage not yet executed */
  quoteResult?: KisQuoteResult;
};

export type OpenDartDiagnosticInput = {
  enabled: boolean;
  apiKey: string;
  /** absent = search stage not yet executed */
  searchResult?: OpenDartSearchResult;
};

export type FinnhubDiagnosticInput = {
  enabled: boolean;
  apiKey: string;
  /** absent = quote stage not yet executed */
  quoteResult?: FinnhubQuoteResult;
};

const LIVE_STATUSES = new Set(["real_time", "delayed", "eod", "cached"]);

// ─────────────────────────────────────────────────────────────────────────────
// KIS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pure function: compute KIS diagnostic result from structured inputs.
 * No filesystem, network, or environment variable access.
 *
 * Returns `unverified` when a required stage has not yet been executed.
 * Returns `healthy` ONLY when the quote result is live AND hasValue=true.
 */
export function evaluateKisDiagnostic(input: KisDiagnosticInput): DiagnosticResult {
  if (!input.enabled) {
    return { status: "disabled", safeMessage: "KIS API가 비활성화되어 있습니다." };
  }

  if (!input.appKey || !input.appSecret) {
    return { status: "credentials_missing", safeMessage: "App Key 또는 App Secret이 저장되지 않았습니다." };
  }

  if (isMockKey(input.appKey) || isMockKey(input.appSecret)) {
    return {
      status: "credentials_invalid",
      safeMessage: "유효한 App Key와 App Secret을 입력해주세요 (placeholder 키 사용 불가).",
    };
  }

  // Stage 3: Exact origin validation — port-only match is not sufficient
  if (!isExpectedKisOrigin(input.baseUrl, input.isPaper)) {
    const expected = input.isPaper ? KIS_PAPER_ORIGIN : KIS_LIVE_ORIGIN;
    return {
      status: "endpoint_mismatch",
      safeMessage: `KIS ${input.isPaper ? "모의투자" : "실전투자"} URL이 올바르지 않습니다. 허용된 origin: ${expected}`,
    };
  }

  // Stage 4: OAuth token — absent = not yet executed
  if (input.tokenResult === undefined) {
    return { status: "unverified", safeMessage: "OAuth 토큰 검증이 아직 실행되지 않았습니다." };
  }

  if (!input.tokenResult.success) {
    const errMsg = input.tokenResult.errorMessage;
    const isAuthError =
      errMsg.includes("401") ||
      errMsg.includes("403") ||
      errMsg.toUpperCase().includes("APPKEY") ||
      errMsg.toLowerCase().includes("invalid") ||
      errMsg.includes("인증");
    return {
      status: isAuthError ? "credentials_invalid" : "token_failed",
      safeMessage: isAuthError
        ? "KIS가 App Key 또는 App Secret을 거부했습니다."
        : "KIS 토큰 발급에 실패했습니다. 서버 상태를 확인하세요.",
    };
  }

  // Stage 5 & 6: Quote — absent = not yet executed
  if (input.quoteResult === undefined) {
    return { status: "unverified", safeMessage: "실제 시세 조회가 아직 실행되지 않았습니다." };
  }

  const q = input.quoteResult;
  if (LIVE_STATUSES.has(q.status)) {
    // hasValue=false with a live status is a provider data error, not healthy
    const hasValue = (q as { hasValue: boolean }).hasValue;
    return hasValue
      ? { status: "healthy", safeMessage: "KIS Open API 시세 연결 및 인증 테스트 성공" }
      : { status: "provider_error", safeMessage: "KIS 응답에 사용 가능한 시세 데이터가 없습니다." };
  }

  if (q.status === "rate_limited") {
    return { status: "rate_limited", safeMessage: "KIS API 호출 한도를 초과했습니다." };
  }

  const errMsg = (q as { message: string | null }).message || "";
  const isAuthError =
    errMsg.includes("인증") ||
    errMsg.toUpperCase().includes("APPKEY") ||
    errMsg.includes("401") ||
    errMsg.includes("403");
  return {
    status: isAuthError ? "credentials_invalid" : "provider_error",
    safeMessage: isAuthError
      ? "KIS가 App Key 또는 App Secret을 거부했습니다."
      : "토큰 발급은 성공했지만 시세 조회가 실패했습니다.",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// OpenDART
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pure function: compute OpenDART diagnostic result.
 *
 * `not_found` is treated as connectivity evidence (API reachable, no filings in period).
 * `eod`/`real_time` require hasValue=true to be healthy.
 */
export function evaluateOpenDartDiagnostic(input: OpenDartDiagnosticInput): DiagnosticResult {
  if (!input.enabled) {
    return { status: "disabled", safeMessage: "OPENDART API가 비활성화되어 있습니다." };
  }
  if (!input.apiKey) {
    return { status: "credentials_missing", safeMessage: "OpenDART API Key가 설정되지 않았습니다." };
  }
  if (isMockKey(input.apiKey)) {
    return {
      status: "credentials_invalid",
      safeMessage: "유효한 OpenDART API Key를 입력해주세요 (placeholder 키 사용 불가).",
    };
  }

  if (input.searchResult === undefined) {
    return { status: "unverified", safeMessage: "공시 조회가 아직 실행되지 않았습니다." };
  }

  const s = input.searchResult;

  // not_found: API is reachable (no data required for connectivity proof)
  if (s.status === "not_found") {
    return { status: "healthy", safeMessage: "OpenDART 전자공시 시스템 정상적으로 연결되었습니다." };
  }

  // eod / real_time: require hasValue=true
  if (LIVE_STATUSES.has(s.status)) {
    const hasValue = (s as { hasValue: boolean }).hasValue;
    return hasValue
      ? { status: "healthy", safeMessage: "OpenDART 전자공시 시스템 정상적으로 연결되었습니다." }
      : { status: "provider_error", safeMessage: "OpenDART 응답에 사용 가능한 공시 데이터가 없습니다." };
  }

  if (s.status === "rate_limited") {
    return { status: "rate_limited", safeMessage: "OpenDART 요청 한도를 초과했습니다." };
  }
  if (s.status === "api_required") {
    return { status: "credentials_missing", safeMessage: "OpenDART API Key 설정이 필요합니다." };
  }

  const errMsg = (s as { message: string | null }).message || "";
  const isAuthError =
    errMsg.includes("인증") || errMsg.includes("Key") || errMsg.includes("010") || errMsg.includes("011");
  return {
    status: isAuthError ? "credentials_invalid" : "provider_error",
    safeMessage: isAuthError ? "OpenDART API Key가 거부되었습니다." : "OpenDART 연결 중 오류가 발생했습니다.",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Finnhub
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pure function: compute Finnhub diagnostic result.
 * Live quote requires hasValue=true to be healthy.
 */
export function evaluateFinnhubDiagnostic(input: FinnhubDiagnosticInput): DiagnosticResult {
  if (!input.enabled) {
    return { status: "disabled", safeMessage: "Finnhub API가 비활성화되어 있습니다." };
  }
  if (!input.apiKey) {
    return { status: "credentials_missing", safeMessage: "Finnhub API Key가 누락되었습니다." };
  }
  if (isMockKey(input.apiKey)) {
    return { status: "credentials_invalid", safeMessage: "유효한 Finnhub API Key를 입력해주세요." };
  }

  if (input.quoteResult === undefined) {
    return { status: "unverified", safeMessage: "실제 시세 조회가 아직 실행되지 않았습니다." };
  }

  const q = input.quoteResult;
  if (LIVE_STATUSES.has(q.status)) {
    const hasValue = (q as { hasValue: boolean }).hasValue;
    return hasValue
      ? { status: "healthy", safeMessage: "Finnhub 시세 조회가 성공했습니다." }
      : { status: "provider_error", safeMessage: "Finnhub 응답에 사용 가능한 시세 데이터가 없습니다." };
  }
  if (q.status === "rate_limited") {
    return { status: "rate_limited", safeMessage: "Finnhub rate limit 초과." };
  }
  return { status: "credentials_invalid", safeMessage: "Finnhub API Key가 거부되었습니다." };
}
