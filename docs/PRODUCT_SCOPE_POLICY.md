# Product Scope Policy

이 문서는 K-Terminal의 제품 범위, 기능적 경계, 그리고 아키텍처 의사결정 원칙을 정의합니다. 본 정책의 목적은 불필요한 기능 확장(Scope Creep)을 방지하고 핵심 투자 터미널로서의 본질에 집중하는 것입니다.

---

## 1. 제품의 본질 정의

1. **개인 맞춤형 투자 터미널**: K-Terminal은 개인 투자자가 미국주식과 한국주식을 분석하고, 백테스트하며, 신호 신뢰도를 판단하고 실시간 경보를 받아보는 고유의 금융 분석 시스템입니다.
2. **비목적성 금융 데이터 배제**: 본 시스템은 단순한 공공데이터 수집기나 생활 금융 정보 제공 앱이 아닙니다.
3. **참고 지표와 핵심 의사결정의 분리**: 외부 심리 지표나 거시 지표는 보조 참고용 레퍼런스로 철저히 격리하며, 핵심 백테스트/시그널 엔진의 의사결정 루프에 직접 결합하지 않습니다.

---

## 2. 기능 범위 명세 (Feature Scope Matrix)

### 2.1 유지 및 고도화 대상 (Maintained & Core)
아래 기능들은 K-Terminal의 핵심 가치로 상시 활성화 및 기능 검증 상태를 유지합니다.
* **DataEnvelope <T>**: 모든 API 응답 및 데이터 통신 규격을 감싸는 표준 데이터 포맷.
* **DataStatus / SourceWarning**: 데이터 신선도, 누락 유무, 비공식/개인용 API 경고 시스템.
* **Provider Settings Center**: 외부 API Key 입력, 검증, 암호화 저장소.
* **OpenDART Integration**: 한국 기업 공시 검색 및 공시 이벤트 탐지 기반.
* **KIS Read-Only**: 한국투자증권 계좌 잔고 및 평가 내역 조회.
* **Market Board & Technical Signals**: 가격 변동 및 기술적 지표(일목균형표, 다윈 박스, 와인스타인 스테이지 등) 계산.
* **Momentum Factor v1**: 단기/중기/장기 모멘텀 지표 산출.
* **Backtest Engine**: Walk-forward 교차 검증 기반 OOS 백테스트 시뮬레이션.
* **Reliability Engine**: Spearman Rank IC 및 정보비율(ICIR) 기반 기술 신호 신뢰도 측정.
* **Regime Gate v1**: 거시경제 지표 및 주가지수 추세를 필터로 하는 시장 국면 판별기.
* **Alert Web Inbox**: 실시간 이벤트를 탐지하여 대시보드에 뿌려주는 알림 수신함.
* **Sentiment Reference Panel**: CNN Fear & Greed 및 Crypto Fear & Greed 격리 표출 패널.

### 2.2 기능 동결 (Frozen / Done)
아래 기능들은 현재 동작 가능한 최소 스펙으로 구현이 유지되며, 추가적인 고도화나 새로운 요구사항을 적용하지 않고 현 상태를 동결합니다.
* **LLM Model Tier Router**: LLM 호출 예산 한도 및 모델 티어 라우터.
* **Strategy Selector**: 사용자 전략 선택 인터페이스.
* **Research Intake Engine**: 백테스트 및 퀀트 리서치 인테이크.
* **Multi-channel Notification Hub**: Telegram/Email SMTP 발송용 채널 (Web Inbox와 Console 알림 중심 작동).
* **Daily Report 자동 발송**: 스케줄러 기반의 매일 보고서 생성/발송.
* **Order Preview / Execution**: 거래 주문 화면 및 실제 집행 관련 구조.
* **Deflated Sharpe Ratio**: 백테스트 오버피팅 검증 지표.

### 2.3 제품 범위 제외 (Excluded)
아래 기능들은 K-Terminal의 제품 본질에 맞지 않으므로, 향후 개발 로드맵 및 백로그에서 **영구 제외**하며 관련 코드를 작성하지 않습니다.
* **외부 미디어 자동 수집**: YouTube Transcript API, GPT Vision, Selenium 등을 이용한 외부 분석가 영상 분석 및 수집 기능.
* **부동산 데이터**: 부동산 매물, 시세 조회 및 주거용 부동산 분석 일체.
* **생활 금융 상품 비교**: 예금, 적금, 대출, 보험, 신용카드 상품 비교 및 추천 기능.
* **금융 오프라인 인프라**: 금융회사 지점 정보 위치 맵, 현금인출기(ATM) 찾기 기능.
* **단순 공공 통계**: 금융민원 통계, 기관별 보도자료 단순 목록 수집.
* **일반 금융 교육**: 초보자용 금융 교육 콘텐츠 및 퀴즈.
* **비투자성 공공 API 및 관리 화면**: 공공데이터포털(`data.go.kr`)의 로그인/활용계정 관리 화면 URL(`https://www.data.go.kr/iim/api/selectAcountList.do` 등)은 API 엔드포인트가 아니므로 등록을 배제하며, 개별 데이터셋의 실제 OpenAPI 엔드포인트만 연동 후보가 될 수 있습니다.

---

## 3. Sentiment Reference 격리 원칙

CNN Fear & Greed 및 Crypto Fear & Greed 등의 심리 지표는 아래 규칙을 엄격히 적용합니다.

1. **독립성 유지**: 해당 지표들은 `SentimentReferencePanel`에 독립적으로 표시되며, `RegimeGate`의 점수식, `StrategySuitability` 적합도 보정, 혹은 핵심 기술적 시그널에 가중치나 직접적인 피드백으로 들어가지 않습니다.
2. **경보 알림 분리**: 극단적 탐욕/공포 진입 시 경보는 발송하지만, 이 경보가 자동 주문 차단(Veto)이나 리스크 억제 시스템의 강제 제어를 유발하지 않습니다.
3. **UI 주의 문구 명시**: 패널 내에 참고용 보조 지표이며 전략 및 주문 판단에 반영되지 않는다는 경고가 항상 투명하게 노출되어야 합니다.

---

## 4. 실거래 주문 제한 정책

1. **실거래 집행 제한**: K-Terminal은 자산 분석 및 시뮬레이션 전용 도구입니다. 실거래 주문 배치 및 브로커 API를 통한 실제 자산 매수/매도 집행은 영구적으로 제품 범위 밖에 있습니다.
2. **모의 투자(Paper Trading) 제한**: K-Terminal 내 모의투자 연동 거래 역시 지원 대상에서 제외합니다.

---

## 5. 관심종목 리포트 인박스 제한 정책 (Watchlist Report Inbox Constraints)

1. **외부 알림 연동 불가**: 이메일, SMS, Telegram, KakaoTalk 등 외부 메신저 및 푸시 알림과의 연계를 금지합니다. 브라우저 푸시 알림 또한 지원하지 않습니다.
2. **내부 알림 뱃지 시스템**: 알림 상태 정보는 오직 웹 앱 내부의 TopCommandBar 내 관심종목 탭 뱃지(unread badge)를 통해서만 사용자에게 표출됩니다. 이 뱃지는 브라우저 탭 활성화 상태(document.visibilityState === "visible") 및 윈도우 포커스에 반응하는 최적화된 로컬 폴링(15초 주기)을 통해 갱신됩니다.
3. **반자동/수동 수집 실행**: 주기적인 백그라운드 스케줄러 수집은 제공하지 않으며, 사용자가 관심종목 추가 시 자동 트리거되거나 "이벤트 수집 실행" 버튼을 직접 클릭하여 반자동으로 구동됩니다.
4. **리서치 자료 전문 보존 및 크롤링 금지**: 유료 증권사 리포트 자동 수집, PDF 전문 저장, 뉴스 전문 크롤링 저장을 일체 불허하며, 오직 원문 링크(`sourceUrl`) 또는 내부 상세 화면 링크(`internalUrl`) 연동으로 대체하여 저작권을 보호합니다.
5. **AI 요약 배제**: 수집된 보고서 또는 이벤트 요약에 LLM의 비확정적 생성 요약(summarization) 기능을 쓰지 않습니다.
6. **투자 추천 문구 사용 금지**: UI 상에 매수/매도 확정, 수익 보장 등의 표현을 금지하며 오직 진단성 정보만 노출합니다.
7. **주문/모의주문 금지**: 실거래 및 모의매매 연동을 지원하지 않습니다.

---

## 6. AI 설명 안전성 정책 및 Structured Output Guard (AI Explanation Safety Policy)

1. **LLM 호출 기능의 분리**: K-Terminal 내부에서는 실시간 LLM 호출 및 AI 생성을 지원하지 않으며, 외부 AI 호출을 통한 자동 리포트 작성을 제한합니다.
2. **Structured Output Guard 검증**: AI 분석 결과가 제공되는 경우, 반드시 deterministic한 `StructuredOutputGuard` 검증 레이어를 거쳐야 합니다.
3. **Grounded Claims 필독**: AI가 생성한 모든 설명(claim)은 `source`, `sourceId`, `status`, `updatedAt`, `warnings`를 포함해야 하며, 출처가 누락되었거나 status가 `error`인 상태에서 riskLevel이 낮은 주장은 즉시 거부됩니다.
4. **금지 문구 검증**: 매수, 매도, 추천, 수익 보장 등의 마케팅성/투자 유도성 표현이 발견되는 경우 출력을 차단(blocked)합니다.
5. **차단 시 UI 행동 지침**: 검증 실패 및 차단된 AI 설명에 대해 UI는 설명 텍스트를 절대 노출하지 않아야 하며, 오직 차단 사유(`blockReasons`)만을 투명하게 표시해야 합니다.
6. **Mock AI Output 어댑터 사용**: 시스템 검증 및 UI 가드 동작 여부를 확인하기 위해 Mock AI Output Adapter를 사용한 테스팅 데이터를 연동할 수 있으며, 이는 실제 외부 AI/LLM의 API 호출이 아닙니다.
7. **Golden 리플레이 레저 및 회귀 수트**: 안전 규정(금지어, 출처 누락 등)의 회귀 검증을 위해 E2E 리플레이 검증 레저 및 회귀 테스트 수트가 동작하며, 이는 실제 AI 호출 이력이 아닌 deterministic 테스트 도구입니다.


