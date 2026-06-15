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
│       └── strategy-score.ts # 시장 레짐 및 포트폴리오 배분 점수
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
