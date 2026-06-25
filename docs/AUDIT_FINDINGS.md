# Audit Findings

이 문서는 K-Terminal에 도입된 통합 감사 Finding (Unified Audit Findings)의 설계 및 운영 정책을 정의한다.

---

## 1. 개요 및 목적

감사 Finding은 개별 신호 IC(Individual Signal IC), 팩터 상관관계(Factor Correlation) 및 시장 노출(Market Exposure) 등 여러 감사 채널에서 발생하는 개별 진단 경고들을 하나의 일관된 포맷으로 가공 및 단일화(Normalization)하여 운영자/연구원에게 제공하는 시스템이다.

---

## 2. 운영 및 해석 원칙 (Non-negotiable Policies)

> [!WARNING]
> **검토 전용 통계 진단 (Diagnostic Only)**:
> 1. **검토 대상 식별 목적**: 모든 감사 Finding은 연구팀의 수동 검토 대상을 식별하기 위한 단순 통계적 진단 수치입니다.
> 2. **비추천/비거래 지시**: 어떠한 Finding 결과도 자동 매매 주문, 자동 전략 파라미터 조정, 또는 특정 종목에 대한 매수/매도/추천 지시로 해석되거나 연결되어서는 안 됩니다.
> 3. **안전한 관심종목 분리**:
>    - `assetId`가 없는(null인) Finding은 관심종목(Watchlist) 개별 종목 경고로 생성하거나 표시하지 않습니다.
>    - 이는 자산군 독립적인 유니버스/신호/시도 단위의 감사 결과를 개별 자산의 직접적 위험 요소로 오해하게 만드는 왜곡을 방지하기 위함입니다.
> 4. **유니버스 해석 제약**: 유니버스 수준(universe-level)의 Finding은 오직 해당 샘플 유니버스 범위 내에서만 통계적 한계를 감안하여 해석해야 하며, 실제 전체 시장에 대한 직접적 결론으로 확장하지 않습니다.
> 5. **원천 정보 보존**: 모든 Finding은 매핑 및 취합 시 원천 데이터의 출처 속성(`sourceType`, `sourceId`, `warnings`, `sourceTier`)을 누락 없이 그대로 보존하여 기록의 신뢰도를 유지합니다.

---

## 3. 스키마 정의

모든 Finding은 아래의 공통 스키마 형태로 저장 및 전송됩니다:

- **`id`**: Finding 고유 식별자 (중복 검출 방지용 키로 생성됨)
- **`sourceType`**: 원천 감사 채널 (`individual_signal_ic` | `factor_correlation` | `market_exposure` 등)
- **`sourceId`**: 원본 감사 결과 레코드의 고유 ID
- **`scope`**: 감사 진단 범위 (`asset` | `universe` | `strategy` | `trial` | `signal` | `factor_pair`)
- **`assetId` / `symbol`**: 자산 단위 Finding일 때만 채워지며, 그 외에는 `null`
- **`universeId`**: 분석 대상 샘플 유니버스 (`KOSPI_SAMPLE` | `SP500_SAMPLE` | `null`)
- **`strategyId` / `trialId`**: 연관 전략 및 개별 백테스트 시도 식별자
- **`signalId`**: 분석 대상 atomic signal
- **`factorA` / `factorB`**: 상관관계 분석 대상 팩터 쌍
- **`title`**: 진단 제목 (예: "개별 신호 IC 진단: [신호ID] / [수평선]")
- **`summary`**: 통계 수치 요약 요약 (매매 편입/제외 권유 등의 어조 배제)
- **`severity`**: 위험 수준 (`info` | `watch` | `warning` | `critical`)
- **`actionability`**: 조치 요구 사항 (`review_only` | `manual_research_required` | `data_quality_check_required` | `not_actionable`)
- **`warnings`**: 바인딩된 경고 코드 리스트
- **`sourceTier`**: 원천 데이터 소스 등급
- **`calculatedAt`**: 연산 시각

---

## 4. AI Explanation & Context Packs (Safety Guard Integration)

이 감사 Finding은 **Structured Output Guard**와 연계되어 안전한 AI 보조 설명의 대상이 될 수 있습니다:
1. **AI Context Pack**: 각 Finding 카드의 "검증 컨텍스트 보기"를 통해 Finding의 정량 지표와 메타데이터가 포함된 `AiContextPack` JSON을 직접 조회할 수 있습니다.
2. **Deterministic Claim Source**: AI 설명의 모든 Claim은 Context Pack의 `sourceRefs`에 명시된 원천 데이터를 기준으로만 작성되어야 하며, 임의 가격/비율 발명이나 매매 추천 유도를 deterministic하게 차단합니다.

