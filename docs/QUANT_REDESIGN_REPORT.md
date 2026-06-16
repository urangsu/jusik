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
