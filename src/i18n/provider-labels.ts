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
