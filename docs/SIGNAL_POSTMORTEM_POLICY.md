# Signal Postmortem Policy

Signal Postmortem Skeleton은 백테스트 또는 실제 모의 운용 시 생성된 개별 투자 진입 신호(Selected Position)의 사후 경과를 보존하고, 신호의 실제 유효성을 정밀 검증하기 위한 기록 아카이브 정책이다.

---

## 1. 개요 및 목적

백테스트 전체 수익률(OOS Return)이나 Sharpe Ratio 같은 포트폴리오 수준의 요약 지표만으로는 "개별 매수 신호가 실제로 맞았는지" 알 수 없다.
Signal Postmortem은 다음 목표를 달성한다:
- **개별 신호 감사 (Signal-Level Audit)**: 백테스트의 Out-of-Sample 구간에서 특정 시점에 선택된 종목들이 포트폴리오 편입 후 실제로 올랐는지, 아니면 손실을 유발했는지 개별적으로 추적한다.
- **신호의 묘지 (Signal Graveyard)**: 백테스트 시뮬레이션 내에서 거래 비용, 슬리피지, 가격 결손 등으로 인해 실패했던 포지션들의 원인을 기록하여 전략 수정의 피드백 루프로 활용한다.
- **다중 기간 분석**: 포지션 진입 시점부터 목표 홀딩 기간 경과 후의 실현 수익률을 집계하여, 최적의 보유 기간을 통계적으로 규명한다.

---

## 2. 저장 구조 및 파일 위치

Signal Postmortem은 전략 Trial 기록과 독립적이면서도 상호참조할 수 있도록 별도의 디렉토리에 저장된다.

```
data/signal-postmortems/
├── events.json           # 포지션 사후 검토 상태 변화 이력 (append-only)
├── latest.json           # 전체 postmortem의 스냅샷 (조회 및 UI 최적화)
└── by-id/
    ├── pm_123456.json    # 개별 postmortem 상세 정보
    └── ...
```

---

## 3. 핵심 도메인 데이터 스키마

### SignalPostmortem
```typescript
export type SignalPostmortem = {
  id: string;                         // pm_로 시작하는 고유 ID
  trialId: string;                    // 연결된 StrategyTrialRecord ID
  strategyId: string;                 // 전략 계열 ID (예: "momentum_v1_long_only")
  ticker: string;                     // 종목 코드 (예: "005930")
  entryDate: string;                  // 신호 진입일 (YYYY-MM-DD)
  exitDate: string;                   // 신호 청산일 (YYYY-MM-DD)
  holdingDays: number;                // 보유 기간 (영업일 기준)
  
  entryPrice: number | null;          // 진입 시점의 (수정)주가
  exitPrice: number | null;           // 청산 시점의 (수정)주가
  positionReturn: number | null;      // 개별 포지션 수익률 (exitPrice / entryPrice - 1)
  
  status: SignalPostmortemStatus;     // pending | success | fail | missing_price | force_closed | ignored
  
  auditMetrics: {
    maxDrawdownDuringHolding: number | null; // 보유 기간 중 최대 낙폭
    maxRunupDuringHolding: number | null;   // 보유 기간 중 최대 상승폭
    spearmanIcAtEntry: number | null;        // 진입 시점 해당 종목의 factor score와 미래 수익률 간 IC
  };
  
  warnings: string[];                 // 가격 데이터 결손, fallback 사용 여부 등의 경고 태그
  createdAt: string;
  updatedAt: string;
};
```

### SignalPostmortemStatus 상태 정의

- **`pending`**: 포지션이 생성되었으나 아직 청산일(`exitDate`)이 도래하지 않았거나, 사후 정산(Postmortem) 계산이 실행되지 않은 상태.
- **`success`**: 포지션 청산이 완료되었고, 수익률이 0보다 큰 경우 (`positionReturn > 0`).
- **`fail`**: 포지션 청산이 완료되었고, 수익률이 0 이하인 경우 (`positionReturn <= 0`).
- **`missing_price`**: 진입 주가 또는 청산 주가가 누락되어 수익률을 신뢰성 있게 계산할 수 없는 상태.
- **`force_closed`**: 전략 내부 로직이 아닌 강제 리밸런싱, 유니버스 제외 등으로 인해 중간 청산된 경우.
- **`ignored`**: 유동성 부족, 거래정지 등으로 인해 실제 포지션 진입이 불가능했던 신호.

---

## 4. 운영 정책

1. **Skeleton 자동 생성**:
   - 백테스트 또는 시뮬레이터가 OOS 구간 리밸런싱을 마칠 때마다, 해당 윈도우에서 선택된 포지션 정보를 기반으로 `SignalPostmortem` 객체를 `pending` 상태로 자동 기록한다.
2. **사후 추적 배치**:
   - 일일 배치 작업 또는 백테스트 등록 CLI 파이프라인에서 가격 데이터가 업데이트되는 시점에 `pending` 상태의 기록들을 탐색하여 실현 수익률을 정산하고 `success` 또는 `fail` 상태로 업데이트한다.
3. **영구 보존**:
   - 한 번 저장된 Skeleton 및 사후 검토 결과는 전략의 백테스트가 갱신되더라도 히스토리 보존을 위해 임의로 삭제하지 않는다.
