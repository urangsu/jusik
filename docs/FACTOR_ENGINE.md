# FACTOR_ENGINE.md

팩터는 단일 재무비율이 아니라 atomic signal의 조합입니다.

* `FactorDefinition`은 `definitionId`와 `factorId`를 분리합니다.
* 같은 value factor라도 시장, 산업, 데이터 소스에 따라 여러 definition이 존재할 수 있습니다.
* `productionEligible` 기본값은 factory를 통해 `false`로 강제합니다.
* Factor Health는 IC/ICIR, turnover, stability, crowding 검증 없이는 `active`가 될 수 없습니다.
