# Cost Guardrails Specification

이 문서는 무분별한 API 및 LLM 호출로 인한 비용 폭탄을 방지하기 위한 설계 한계치 정책에 관해 설명합니다.

## 1. 비용 제한 정책
* **DAILY_REPORT_USE_LLM**: 기본값 `false`. 인공지능 요약에 따른 토큰 과금을 방지하며, LLM 없이도 템플릿 기반으로 리포트가 정상 생성됩니다.
* **DAILY_REPORT_MAX_API_CALLS**: 기본값 `300`. 일일 총 API 호출량이 300회를 넘는 경우 `partial` 상태로 리포트를 마킹하고 추가적인 시세/데이터 API 호출을 물리적으로 중단합니다. 생략된 섹션은 리포트에 비용 제한 안내문구와 함께 표기됩니다.
