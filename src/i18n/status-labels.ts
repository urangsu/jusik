import { DataStatus } from "@/domain/common/data-status";
import { SourceWarning } from "@/domain/source/provider-tier";
import { Locale } from "./locale";

export const KO_DATA_STATUS_LABELS: Record<DataStatus, string> = {
  real_time: "실시간",
  delayed: "지연",
  eod: "종가",
  cached: "캐시",
  stale: "오래됨",
  api_required: "API 필요",
  rate_limited: "호출 제한",
  not_supported: "미지원",
  not_found: "없음",
  error: "오류",
  insufficient_data: "데이터 부족",
};

export const EN_DATA_STATUS_LABELS: Record<DataStatus, string> = {
  real_time: "Real-time",
  delayed: "Delayed",
  eod: "EOD",
  cached: "Cached",
  stale: "Stale",
  api_required: "API Required",
  rate_limited: "Rate Limited",
  not_supported: "Not Supported",
  not_found: "Not Found",
  error: "Error",
  insufficient_data: "Insufficient Data",
};

export const KO_SOURCE_WARNING_LABELS: Record<SourceWarning, string> = {
  none: "없음",
  unofficial: "비공식",
  personal_use_only: "개인 연구용",
  license_review_required: "라이선스 검토 필요",
  commercial_use_not_allowed: "상업적 이용 불가",
  manual_import_required: "수동 임포트 필요",
};

export const EN_SOURCE_WARNING_LABELS: Record<SourceWarning, string> = {
  none: "None",
  unofficial: "Unofficial",
  personal_use_only: "Personal Use Only",
  license_review_required: "License Review Required",
  commercial_use_not_allowed: "Commercial Use Prohibited",
  manual_import_required: "Manual Import Required",
};

export function getDataStatusLabel(status: DataStatus, locale: Locale): string {
  const dict = locale === "ko" ? KO_DATA_STATUS_LABELS : EN_DATA_STATUS_LABELS;
  return dict[status] || status;
}

export function getSourceWarningLabel(warning: SourceWarning, locale: Locale): string {
  const dict = locale === "ko" ? KO_SOURCE_WARNING_LABELS : EN_SOURCE_WARNING_LABELS;
  return dict[warning] || warning;
}
