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
  configured: "설정됨",
  api_required: "API 키 필요",
  rate_limited: "요청 제한",
  not_found: "데이터 없음",
  error: "오류",
  maintenance: "점검 중",
  healthy: "정상",
  disabled: "비활성화",
  degraded: "저하됨",
};

export const EN_PROVIDER_STATUS_LABELS: Record<string, string> = {
  configured: "Configured",
  api_required: "API Key Required",
  rate_limited: "Rate Limited",
  not_found: "Not Found",
  error: "Error",
  maintenance: "Maintenance",
  healthy: "Healthy",
  disabled: "Disabled",
  degraded: "Degraded",
};

export function getProviderStatusLabel(status: string, locale: Locale): string {
  const dict = locale === "ko" ? KO_PROVIDER_STATUS_LABELS : EN_PROVIDER_STATUS_LABELS;
  return dict[status] || status;
}
