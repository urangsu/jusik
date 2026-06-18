# STRATEGY_AGREEMENT.md

전략 합의는 여러 전략 뷰의 방향 일치 정도를 보여주는 진단 도구입니다.

* 참여 가능한 전략 뷰가 3개 미만이면 계산하지 않습니다.
* null score는 0으로 계산하지 않습니다.
* 낮은 데이터 품질과 레짐 위험은 라벨 강도를 제한합니다.
* 결과 문구는 관찰, 중립, 주의, 위험, 데이터 부족만 사용합니다.

## Input Conditions

Strategy Agreement는 다음 입력이 있어야 계산할 수 있습니다.

- 최소 3개 이상의 valid strategy view.
- 각 view의 finite score.
- 각 view의 status가 `insufficient_data`가 아님.
- dataQualityScore.
- vetoReasons.
- signal freshness 또는 expiryAt.

입력 조건이 충족되지 않으면 `agreementScore=null`, `agreementLabel=insufficient_data`, `status=insufficient_data`를 반환합니다.

## Veto-first Order

1. P0 fatal veto 확인.
2. 참여 가능한 view 수 확인.
3. null/non-finite score 제외.
4. weighted score 계산.
5. data quality cap 적용.
6. macro/regime risk cap 적용.

P0 fatal veto가 있으면 평균 점수 계산 전에 종료합니다.

## Confidence and Freshness

P0에서는 confidence와 freshness weighting을 계산하지 않습니다. 후속 작업에서는 stale view와 expired overlay를 제외하거나 낮은 weight로 처리해야 합니다.

## Missing-data UI

데이터 부족 상태에서는 score, agreementRate, weightedScore를 표시하지 않습니다. UI는 다음 문구를 사용합니다.

- 전략 합의 계산 불가
- 필요 데이터가 아직 연결되지 않았습니다.
- 현재 상태: 데이터 부족

## Forbidden Wording

사용자 화면에서 다음 표현을 쓰지 않습니다.

- 종합 추천
- 매수 추천
- 강력 매수
- 매도 추천
- 목표가
- 확정 진입

## Regime Gate & Suitability Adjustment

시장 레짐이 `risk_off` 또는 `panic`으로 판별되는 경우:
1. `panic` 레짐: 모든 전략 합의 점수를 차단하고 상태를 `insufficient_data`로 변경하며 적합도를 제한합니다.
2. `risk_off` 레짐: `strong_watch` 및 `watch` 신호를 `caution`(주의)으로 하향(Cap) 조정합니다.
3. 전략 적합도 라벨 및 상태 필터링 시 `검토`, `관망`, `주의`, `위험`, `데이터 부족` 만 사용하여 사용자를 현혹하는 문구를 배제합니다.

