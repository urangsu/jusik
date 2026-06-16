# FACTOR_REGISTRY_FUTURE.md

Factor Registry는 다음 작업에서 구현합니다. 002-B에서는 정책과 필드만 고정합니다.

## Required Fields

- `factorId`
- `definitionId`
- `engineVersion`
- `configHash`
- `productionEligible`
- `validationStatus`
- `universe`
- `market`
- `dataDependencies`

## Rules

- 기본값은 `productionEligible=false`.
- IC/ICIR, turnover, cost, out-of-sample, stability 검증 전 production 전환 금지.
- KR/US universe는 별도 registry entry로 관리한다.
- 같은 factorId라도 definitionId와 configHash가 다르면 다른 정의로 취급한다.
