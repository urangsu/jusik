# SEED_DATA_POLICY.md

## Purpose

Seed data exists only to keep the shell and contracts testable before providers are connected.

## Allowed Wording

- 샘플 데이터
- 데모 유니버스
- API 연결 전
- 계산 예시
- 실제 투자 신호 아님

## Forbidden Wording

- 실시간
- 검증 완료
- 전략 합의 완료
- 추천
- 매수
- 목표가
- 예상 수익률

## Runtime Rules

- `SEED_DEMO` is always `productionEligible=false`.
- Seed snapshots must carry a `dataVersionId`.
- Seed data must not feed factor validation, production signals, or Strategy Agreement scoring.
