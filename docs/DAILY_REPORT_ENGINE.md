# Daily Report Engine Spec

이 문서는 일일 장마감 후 구동되는 Daily Report Engine에 대한 명세서입니다.

## 1. 개요
Daily Report Engine은 매일 17:30(KST)에 기계적으로 구동하여 당일 시장 동향, 변동성 상위 종목, 누적 알림 이력, API 상태 등을 종합 정리한 마크다운 리포트를 자동 생성합니다.

## 2. 무결성 검증 (Report Integrity Checker)
* 생성 후 즉시 10개 검증 요건을 통과해야 배포됩니다:
  1. `generatedAt` 정보 존재
  2. `reportDate` 일치 여부
  3. 최소 5개 이상의 개별 리포트 섹션 존재
  4. 데이터 품질 소스 요약(`sourceSummary`) 포함
  5. personal_fallback(yfinance) 사용 시 데이터 품질 경고 포함 여부
  6. 이상 감지 데이터 유무 검사 등
* 검증 실패 시, 해당 리포트는 `failed_integrity_check`로 마킹되고 즉시 `system_error` 알림을 디스패치합니다.

## 3. 보존 정책 (Retention)
* **알림 이벤트 (`events.json`)**: 90일
* **알림 발송 이력 (`deliveries.json`)**: 90일
* **일일 보고서 (`reports.json`)**: 180일
* 초과 시 `prune` 작업이 기계적으로 구동됩니다.
