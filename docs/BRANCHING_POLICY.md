# BRANCHING_POLICY.md

K-Terminal의 Quant Core 작업은 main에 직접 커밋하지 않습니다.

## Branch Rules

- `main`: 리뷰 후 병합되는 안정 브랜치.
- `codex/quant-core-contract`: 002-A Quant Core 계약 기준 브랜치.
- `codex/quant-core-guardrails`: 002-B guard rail 안정화 브랜치.

## Pull Request Strategy

권장 흐름은 다음과 같습니다.

1. `codex/quant-core-guardrails` -> `codex/quant-core-contract`
2. 리뷰 후 `codex/quant-core-contract` -> `main`

## Commit Rules

- 1 commit = 1 intent.
- 테스트는 구현과 같은 커밋에 둔다.
- 문서, CI, UI, domain contract는 가능한 한 분리한다.
- history rewrite가 필요하면 pushed branch에서는 `--force-with-lease`만 사용한다.
