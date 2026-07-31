import { SourceUsagePolicy } from "@/domain/source/provider-tier";
import { Locale } from "./locale";

export const KO_PROVIDER_POLICY_LABELS: Record<SourceUsagePolicy, string> = {
  official: "공식",
  free_limited: "무료 제한",
  licensed_free: "라이선스 무료",
  personal_fallback: "개인 fallback",
  manual_import: "수동 임포트",
};

export const EN_PROVIDER_POLICY_LABELS: Record<SourceUsagePolicy, string> = {
  official: "Official",
  free_limited: "Free Limited",
  licensed_free: "Licensed Free",
  personal_fallback: "Personal Fallback",
  manual_import: "Manual Import",
};

export function getProviderPolicyLabel(policy: SourceUsagePolicy, locale: Locale): string {
  const dict = locale === "ko" ? KO_PROVIDER_POLICY_LABELS : EN_PROVIDER_POLICY_LABELS;
  return dict[policy] || policy;
}

export const KO_PROVIDER_STATUS_LABELS: Record<string, string> = {
  disabled: "비활성화됨",
  not_configured: "미입력",
  configured: "저장됨 (미검증)",
  unverified: "미검증",
  credentials_missing: "키 누락",
  credentials_invalid: "자격증명 거부",
  endpoint_mismatch: "포트/URL 오류",
  token_failed: "토큰 발급 실패",
  rate_limited: "호출 한도 초과",
  provider_error: "연결 오류",
  healthy: "정상 연결",
  invalid_key: "자격증명 거부",
  error: "연결 오류",
  api_required: "API 키 필요",
  not_found: "데이터 없음",
  maintenance: "점검 중",
  degraded: "저하됨",
};

export const EN_PROVIDER_STATUS_LABELS: Record<string, string> = {
  disabled: "Disabled",
  not_configured: "Unconfigured",
  configured: "Saved (Unverified)",
  unverified: "Unverified",
  credentials_missing: "Keys Missing",
  credentials_invalid: "Credentials Invalid",
  endpoint_mismatch: "Endpoint Mismatch",
  token_failed: "Token Failed",
  rate_limited: "Rate Limited",
  provider_error: "Provider Error",
  healthy: "Healthy Connection",
  invalid_key: "Invalid Key",
  error: "Connection Error",
  api_required: "API Key Required",
  not_found: "Not Found",
  maintenance: "Maintenance",
  degraded: "Degraded",
};

export function getProviderStatusLabel(status: string, locale: Locale): string {
  const dict = locale === "ko" ? KO_PROVIDER_STATUS_LABELS : EN_PROVIDER_STATUS_LABELS;
  return dict[status] || status;
}
