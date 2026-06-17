import { DataStatus } from "../common/data-status";

export type OpenDartStatusCode =
  | "000" // 정상
  | "010" // 등록되지 않은 키
  | "011" // 사용할 수 없는 키
  | "012" // 접근할 수 없는 IP
  | "013" // 조회된 데이터 없음
  | "014" // 파일 없음
  | "020" // 요청 제한 초과
  | "021" // 조회 가능 회사 개수 초과
  | "100" // 필드 누락/부적절
  | "101" // 부적절한 접근
  | "800" // 시스템 점검
  | "900" // 정의되지 않은 오류
  | string;

export function mapOpenDartStatusToDataStatus(
  status: OpenDartStatusCode
): DataStatus {
  switch (status) {
    case "000":
      return "eod";
    case "013":
      return "not_found";
    case "020":
    case "021":
      return "rate_limited";
    case "010":
    case "011":
    case "012":
    case "100":
    case "101":
    case "800":
    case "900":
      return "error";
    default:
      return "error";
  }
}
