# SIGNAL_VALIDATION.md

검증 함수는 `ResearchCalcResult<T>`를 반환합니다.

* `value`: 계산 결과 또는 `null`.
* `status`: `ok`, `insufficient_data`, `invalid_input`, `not_supported`, `error`.
* `warnings`: 계산 불가 또는 품질 저하 이유.
* `sampleSize`: 유효 표본 수.

Rank IC는 Spearman rank correlation입니다. 공통 종목 교집합만 사용하고, null/NaN/Infinity는 제외하며, 동점은 average rank로 처리합니다.

## Rank IC

계산 순서:

1. factorScores와 forwardReturns의 공통 asset intersection을 만든다.
2. factor score 또는 forward return이 null/NaN/Infinity인 row를 제외한다.
3. filtering 이후 sampleSize를 계산한다.
4. sampleSize < 30이면 `insufficient_data`.
5. 동점은 average rank.
6. ranked factor와 ranked forward return의 Pearson correlation을 계산한다.

forward return은 calcDate 이후 horizon 수익률이어야 하며 look-ahead는 금지합니다.

## ICIR

ICIR은 IC mean / sample standard deviation입니다.

- window가 부족하면 `insufficient_data`.
- sample stddev를 사용합니다.
- stddev가 0이면 `insufficient_data`.
- NaN/Infinity는 result value로 반환하지 않습니다.

## Turnover and Stability

개인투자자용 신호는 다음 조건을 만족해야 action 가능 후보가 됩니다.

- label이 최소 3일 이상 유지.
- flipCount30d가 과도하지 않음.
- rank autocorrelation이 지나치게 낮지 않음.
- 예상 거래비용이 신호 강도를 잠식하지 않음.

## Multiple Testing Guard

신규 factor와 rule은 기본 `productionEligible=false`입니다. IC, turnover, cost, out-of-sample, stability 검증 전 production 전환 금지입니다.

## Failure Result

모든 research math 함수는 실패 시 `ResearchCalcResult<T>`의 `value: null`, non-ok `status`, `warnings`를 반환합니다. NaN/Infinity를 value로 반환하지 않습니다.
