import { DataStatus } from "@/domain/common/data-status";

/**
 * Normalizes KIS Open API error codes to standard K-Terminal DataStatus.
 */
export function normalizeKisError(rtCd: string, msgCd: string, msg1: string): DataStatus {
  if (rtCd === "0") {
    return "real_time";
  }

  const cleanCd = (msgCd || "").trim();
  const cleanMsg = (msg1 || "").trim();

  // EGW prefix stands for KIS Gateway/Traffic issues (Rate limits)
  if (cleanCd.startsWith("EGW") || cleanMsg.includes("초당") || cleanMsg.includes("제한")) {
    return "rate_limited";
  }

  // Not found codes
  if (
    cleanCd === "OPS00007" ||
    cleanCd === "OPS00009" ||
    cleanMsg.includes("존재하지 않는") ||
    cleanMsg.includes("없는 종목")
  ) {
    return "not_found";
  }

  return "error";
}
