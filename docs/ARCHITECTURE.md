# ARCHITECTURE.md

이 문서는 K-Terminal의 폴더 구조, 종목/시세/재무 데이터 연동 방식, 그리고 어댑터 인터페이스에 대한 소프트웨어 아키텍처 명세를 다룹니다.

## 1. 디렉토리 구조 및 역할

프로젝트 소스 코드는 `src/` 폴더 아래에서 영역별로 계층화되어 있습니다.

```txt
src/
├── app/                      # Next.js App Router (페이지 및 전역 스타일)
│   ├── globals.css           # 디자인 토큰(CSS variables) 및 기본 테마 정의
│   ├── layout.tsx            # 메타데이터 설정 및 HTML 루트 뼈대
│   └── page.tsx              # TerminalShell을 로드하는 애플리케이션 진입점
├── components/               # 재사용 및 화면 구성 UI 컴포넌트
│   ├── search/               # 종목 검색 관련 컴포넌트 (초성 검색 지원)
│   │   └── AssetSearchBox.tsx
│   ├── strategy/             # 전략 진단 탭 및 신호 표시 컴포넌트
│   │   ├── StrategyWorkspace.tsx
│   │   ├── StdDevTradingTab.tsx
│   │   └── StrategyAgreementTab.tsx
│   ├── shell/                # App Shell 구성 요소 (레이아웃, 메뉴, 상태바 등)
│   │   ├── BottomStatusBar.tsx
│   │   ├── LeftRail.tsx
│   │   ├── MarketStrip.tsx
│   │   ├── RightRail.tsx
│   │   ├── TerminalShell.tsx
│   │   └── TopCommandBar.tsx
│   └── ui/                   # 디자인 시스템에 부합하는 원자 단위 컴포넌트
│       ├── CommandInput.tsx  # 검색/명령창 입력 필드
│       ├── DataCard.tsx      # depth를 가지는 기본 카드 프레임
│       ├── MetricCell.tsx    # 수치 렌더링 및 null/상태 분기 처리
│       ├── Panel.tsx         # translucent border 패널
│       ├── PillTabs.tsx      # pill-shaped 선택 탭
│       └── StatusBadge.tsx   # 데이터 상태 뱃지
├── domain/                   # 비즈니스 로직 및 공통 타입 모델 (pure TypeScript)
│   ├── common/
│   │   └── data-status.ts    # DataStatus 및 DataEnvelope 데이터 봉투 계약
│   ├── factor/
│   │   └── factor-value.ts   # 전략 팩터 모델
│   ├── filing/
│   │   └── filing.ts         # 공시 정보 데이터 스키마
│   ├── financials/
│   │   ├── dividend.ts       # 배당 정보 모델
│   │   ├── financial-ratio.ts# 재무 비율 스키마
│   │   └── financial-statement.ts # 연결/별도 재무제표 스키마
│   ├── market/
│   │   ├── asset.ts          # 한국/미국 공통 종목 메타데이터
│   │   ├── ohlcv.ts          # 차트 캔들 데이터 구조
│   │   └── quote.ts          # 실시간/지연 시세 데이터 모델
│   ├── news/
│   │   └── news.ts           # 뉴스 피드 모델
│   ├── portfolio/
│   │   └── holding.ts        # 포트폴리오 자산 보유량 모델
│   ├── search/
│   │   ├── asset-search.normalizer.ts # 초성 매칭 알고리즘 및 노멀라이저
│   │   └── asset-search.types.ts
│   └── strategy/
│       ├── strategy-score.ts # 시장 레짐 및 포트폴리오 배분 점수
│       ├── stddev-signal.ts  # 표준편차 위치 진단 타입
│       ├── calculate-stddev-signal.ts
│       ├── strategy-view.ts  # 전략 합의 입력 전략 뷰 타입
│       ├── strategy-agreement-signal.ts
│       └── calculate-strategy-agreement-signal.ts
│   ├── research/              # 순수 퀀트 리서치 계산 함수
│   │   ├── validation/        # Rank IC, ICIR
│   │   ├── normalization/     # 시장/유니버스 단면 정규화
│   │   └── risk/              # 팩터 공분산, 포트폴리오 리스크 분해
└── server/
    └── adapters/             # 외부 금융 API 연결을 위한 인터페이스 및 구현체
        ├── api-required-provider.ts # API 미연결 시 fallback 어댑터
        ├── dart-provider.ts  # 한국 OpenDART 공시 연동 어댑터
        ├── kr-market-provider.ts # 한국 투자증권 시세 연동 어댑터
        ├── sec-provider.ts   # 미국 SEC EDGAR 공시 연동 어댑터
        ├── types.ts          # 데이터 수집 인터페이스 계약
        └── us-market-provider.ts # 미국 Finnhub/FMP 시세 연동 어댑터
```

---

## 2. 데이터 흐름 및 `DataEnvelope` 계약

K-Terminal은 프론트엔드와 백엔드 간에 금융 정보 오염(잘못된 모의 값 유출)을 물리적으로 차단하기 위해 **DataEnvelope** 패턴을 의무화합니다.

```typescript
export type DataEnvelope<T> = {
  value: T | null;
  status: DataStatus;
  source: string;
  updatedAt: string | null;
  delayMinutes?: number;
  errorCode?: string;
  message?: string;
};
```

1. **상태 보존**: 컴포넌트는 수치 데이터 `T`에 직접 접근하지 않고, `status`를 통해 해당 데이터가 `real_time`인지, `api_required` 상태인지 검증합니다.
2. **엄격한 렌더링**: `MetricCell` 및 `StatusBadge` 컴포넌트는 `value`가 `null`이거나 `status`가 정상 상태(`real_time`, `delayed`, `eod`, `cached`)가 아닐 때 값을 숫자 `0` 등으로 왜곡하지 않고 명확히 에러나 API 필요 메시지를 바인딩합니다.

---

## 3. 어댑터 디자인 패턴

모든 시세 및 공시 파이프라인은 인터페이스(`src/server/adapters/types.ts`)를 기준으로 느슨하게 결합되어 있습니다.

* **MarketDataProvider**: 개별 주식 시세(`Quote`) 및 차트(`Ohlcv`) 데이터 수집.
* **FilingProvider**: 한국 DART 접수 정보 및 미국 SEC EDGAR 보고서 조회.
* **FinancialProvider**: 분기/연간 연결재무제표(`FinancialStatement`) 조회.

P0 단계에서는 실제 API 호출을 수행하는 대신, `ApiRequiredProvider`를 공통으로 주입받아 작동 상태를 모방합니다. 이를 통해 API Credential 유출 위험을 방지하고 개발자 로컬 환경에서도 UI가 깨지지 않고 안전하게 부팅됩니다.

---

## 4. 전략 신호 계층

전략 계층은 UI에서 직접 수치를 만들지 않고 `src/domain/strategy/`의 순수 계산 함수만 통해 신호 객체를 생성합니다.

* `calculateStdDevSignal`: 종가 배열이 충분할 때만 이동평균, 표준편차, z-score를 계산합니다. 데이터 부족, 0 표준편차, `NaN`, `Infinity`는 모두 `insufficient_data`로 처리합니다.
* `calculateStrategyAgreementSignal`: 참여 가능한 전략 뷰가 3개 이상이고 점수가 유효할 때만 합의 점수를 계산합니다. 레짐 위험, 낮은 데이터 품질, fatal veto는 라벨 강도를 제한합니다.
* 전략 UI는 계산 결과의 `status`, `dataQualityScore`, `vetoReasons`를 그대로 표시하며, 데이터가 없을 때 숫자를 0으로 대체하지 않습니다.

---

## 5. Quant Core Research Layer

P0/P1 퀀트 코어는 서버 실행 로직이 아니라 순수 TypeScript 함수로 시작합니다. 계산 함수는 `ResearchCalcResult<T>`를 반환해 값, 상태, 경고, 표본 수를 함께 보존합니다.

* Rank IC는 공통 종목 교집합과 finite 값만 사용하며, 동점은 average rank로 처리합니다.
* 단면 정규화는 한 번에 하나의 `market + universe` 안에서만 수행합니다. KR과 US를 같은 percentile 공간에 넣지 않습니다.
* 리스크 분해는 `totalVariance = factorVariance + specificVariance`를 기준으로 하고, volatility는 variance의 제곱근으로만 계산합니다.

---

## 6. Runtime Boundary

`src/domain/research/`는 pure math layer입니다. Next.js runtime, server actions, API credentials, network calls를 import하지 않습니다.

`src/server/`는 후속 작업에서 orchestration wrapper만 담당합니다.

```txt
domain/research: deterministic calculation
server/research: data load, PIT lookup, run orchestration
components: render DataEnvelope/ViewSignal only
```

이 경계를 깨면 테스트, 백테스트, worker migration이 어려워집니다.

---

## 7. Guard Rail Automation

CI는 다음을 실행합니다.

```bash
npm ci
npm run typecheck
npm run lint
npm run test
npm run check:wording
npm run check:alpha-ui
npm run build
```

`check:wording`은 UI 실행 경로의 투자조언성 문구를 fail 처리합니다. 문서의 금지어 설명은 warning만 출력합니다.

`check:alpha-ui`는 `expectedAlphaAnnualized`와 expected alpha wording이 UI 경로에 들어가는 것을 차단합니다.

---

## 8. PIT and Universe Foundation

003-A introduces immutable PIT contracts and universe snapshots before any real provider is connected.

```txt
AssetIdentity -> UniverseMembership -> UniverseSnapshot
DataVersion -> PitRecord -> getAsOf(knownAt)
```

`InMemoryDataVersionStore` and `InMemoryPitStore` are test/dev-only boundaries. Production storage will be introduced later and must preserve immutable historical records.
