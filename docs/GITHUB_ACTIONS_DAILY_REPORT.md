# GitHub Actions Daily Report Automation

이 문서는 GitHub Actions를 통한 일일 리포트 스케줄 구동 방법을 서술합니다.

## 1. 워크플로우 명세 (`daily-report.yml`)
* **수동 트리거 (`workflow_dispatch`)**: `force_run` 옵션을 제공하여 비거래일(주말)에도 강제 생성이 가능합니다.
* **자동 스케줄 (`schedule`)**: 평일(월~금) 17:30 KST (`cron: "30 8 * * 1-5"`)에 작동합니다.
* **보안**: Secrets는 로그에 출력되지 않도록 설계하며, yfinance 등 비공식 데이터는 기본 disabled 설정 하에 작동합니다.
