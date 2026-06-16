# QUANT_REDESIGN_REPORT.md

K-Terminal의 퀀트 엔진은 UI 점수표가 아니라 검증 가능한 research pipeline이어야 합니다.

```txt
PIT Data
  -> Atomic Signals
  -> Factor Definitions
  -> Local Normalization
  -> Validation: IC / ICIR / turnover / stability
  -> Alpha Rank
  -> Risk: B Sigma_F B' + D
  -> Strategy Agreement
  -> Explanation UI
```

002-A는 이 전체 구조 중 contracts와 pure math만 고정합니다. 실제 데이터 공급, 성과 백테스트, optimizer는 후속 작업입니다.

## Current Goal

002-A/002-B의 목표는 실제 투자 신호를 만드는 것이 아니라, 후속 개발자가 검증되지 않은 숫자를 제품 기능처럼 노출하지 못하게 하는 계약 기반을 고정하는 것입니다.

## Non-goals

- 실제 DART, SEC, KRX, KIS, Polygon, Finnhub, FMP 연결.
- 실제 factor return 계산.
- 실제 PIT store 구현.
- 실제 optimizer 또는 주문 기능.
- expected alpha percent UI 표시.
- 인플루언서/LLM 기반 점수 생성.

## Core Quant vs Overlay

Core Quant는 value, momentum, quality, lowvol, shareholder yield 같은 검증 가능한 팩터 정의와 validation history를 다룹니다. Overlay는 stddev, hedge fund, influencer, macro funding처럼 timing, risk gate, explanation을 보조합니다.

Overlay는 core alpha rank를 단독으로 뒤집을 수 없습니다. Overlay는 `vetoReasons`, `caution`, `expiryAt`, `dataQualityScore`로만 영향을 줍니다.

## PIT Data Requirement

모든 계산은 어떤 원천 데이터로 계산됐는지 추적해야 합니다.

- `DataVersion`: vendor, source, asOfDate, effectiveAt, ingestedAt, revisionId, hash.
- `EngineVersion`: engineId, engineVersion, configHash, gitCommitSha, createdAt.
- `SignalVersion`: signalVersionId, engine, dataVersionId, inputHash, calculatedAt, expiryAt.

정정 공시나 vendor revision이 있으면 기존 값을 덮어쓰지 않고 새 dataVersion으로 취급합니다.

## Factor Definition

팩터는 atomic signal의 조합으로만 정의합니다. ROE 하나를 quality로 부르거나, PER/PBR/ROE를 시장 전체에서 단순 합산하지 않습니다. 같은 `factorId`라도 `definitionId`와 `configHash`가 다르면 다른 정의입니다.

## Validation

Factor Health는 IC/ICIR, Rank IC, turnover, stability, cost, out-of-sample 검증 전에는 active처럼 표시할 수 없습니다. sample size 부족은 `insufficient_data`입니다.

## Risk Decomposition

리스크는 variance 기준으로 합산합니다.

```txt
totalVariance = factorVariance + specificVariance
totalVolatility = sqrt(totalVariance)
```

volatility끼리 더하지 않습니다.

## Strategy Agreement

Strategy Agreement는 합의 진단 도구입니다. 참여 가능한 전략 뷰가 3개 미만이면 계산하지 않고 `insufficient_data`를 반환합니다. null score는 0으로 계산하지 않습니다.

## Roadmap

- P0: contracts, missing-data state, guard scripts, CI.
- P1: provider contracts, PIT store shape, universe builder.
- P2: factor definition implementation and validation history.
- P3: portfolio risk diagnostics and optimizer candidate evaluation.

현재 단계는 actual signal이 아니라 contract 단계입니다.
