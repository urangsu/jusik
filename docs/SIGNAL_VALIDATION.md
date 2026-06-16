# SIGNAL_VALIDATION.md

검증 함수는 `ResearchCalcResult<T>`를 반환합니다.

* `value`: 계산 결과 또는 `null`.
* `status`: `ok`, `insufficient_data`, `invalid_input`, `not_supported`, `error`.
* `warnings`: 계산 불가 또는 품질 저하 이유.
* `sampleSize`: 유효 표본 수.

Rank IC는 Spearman rank correlation입니다. 공통 종목 교집합만 사용하고, null/NaN/Infinity는 제외하며, 동점은 average rank로 처리합니다.
