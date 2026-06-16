# STRATEGY_SIGNALS.md

K-Terminal의 전략 신호는 투자 조언이 아니라 진단 도구입니다. 화면의 모든 라벨은 사용자가 직접 판단하기 위한 상태 설명이며, 실제 매수/매도 판단은 사용자 책임입니다.

## 1. 공통 원칙

* 전략 점수는 AI가 생성하지 않습니다. AI는 제공된 데이터, 계산 결과, veto 사유만 설명할 수 있습니다.
* 실제 데이터가 부족하면 `api_required` 또는 `insufficient_data`를 표시하고 점수를 계산하지 않습니다.
* `null` 값은 `0`으로 대체하지 않습니다.
* 전략 출력은 `dataQualityScore`와 `vetoReasons`를 포함해야 합니다.

## 2. 표준편차 매매 탭

표준편차 매매 탭은 선택 종목의 현재 가격이 이동평균 대비 어느 위치에 있는지 진단합니다. 가격선이나 밴드는 실제 OHLCV 데이터가 연결된 뒤에만 렌더링합니다.

계산식:

```txt
movingAverage = recent closes average over window
standardDeviation = sqrt(sum((close - movingAverage)^2) / window)
zScore = (lastPrice - movingAverage) / standardDeviation
```

z-score 해석 기준:

* `zScore <= -2.0`: `deep_oversold`
* `-2.0 < zScore <= -1.0`: `oversold`
* `-1.0 < zScore < 1.0`: `neutral`
* `1.0 <= zScore < 2.0`: `overbought`
* `zScore >= 2.0`: `deep_overbought`

데이터 부족 처리:

* 종가 길이가 window보다 짧으면 `insufficient_data`.
* 표준편차가 0이면 `insufficient_data`.
* `NaN`, `Infinity`, `undefined` 입력은 `insufficient_data`.
* 실패 시 `lastPrice`, `movingAverage`, `standardDeviation`, `zScore`, 밴드 값, `signalStrength`는 모두 `null`.

## 3. 전략 합의 탭

전략 합의 탭은 여러 전략 뷰가 공통 방향을 가리키는지 보는 합의 진단 도구입니다.

참여 뷰:

* 레짐-우선 뷰
* 월천식 눌림 뷰
* 표준편차 뷰
* 기본 퀀트
* 배당/환원
* 모멘텀

가중치:

* `macro_first_largecap`: 0.25
* `wolcheon_pullback`: 0.15
* `stddev_mean_reversion`: 0.15
* `fundamental_quant`: 0.20
* `dividend_return`: 0.10
* `momentum`: 0.15

계산 원칙:

* `insufficient_data` 전략은 합의 계산에서 제외합니다.
* 참여 가능한 전략 수가 3개 미만이면 합의 점수를 계산하지 않습니다.
* 평균 `dataQualityScore`가 70 미만이면 라벨은 `caution` 이하로 제한합니다.
* `P0 fatal` veto가 있으면 전략 합의 불가로 처리합니다.
* 레짐 뷰가 `risk`이면 `strong_watch`를 금지합니다.

출력 라벨:

* 80 이상 + 합의율 70% 이상: `strong_watch` / 검토 우선
* 65 이상: `watch` / 관찰
* 45 이상 65 미만: `neutral` / 중립
* 30 이상 45 미만: `caution` / 주의
* 30 미만: `risk` / 위험
* 계산 불가: `insufficient_data` / 전략 합의 불가

## 4. 제품 내 문구

전략 합의 탭에는 다음 고지를 표시합니다.

```txt
이 화면은 여러 전략 신호의 합의 정도를 보여주는 진단 도구이며, 매수·매도 지시가 아닙니다.
```
