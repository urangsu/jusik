# K-Terminal Foundation

미국주식과 한국주식을 함께 분석하는 개인투자용 한국어 금융 터미널의 첫 번째 기반(P0) 프로젝트입니다.
이 프로젝트는 가짜 데이터를 임의로 표시하지 않고, 데이터의 상태(Data Status)를 투명하게 제공하여 안전하고 지속 가능한 금융 정보 분석 인프라를 구축하는 것을 목표로 합니다.

## 1. 프로젝트 주요 원칙
* **정직한 데이터**: API 연결이 되지 않았을 때 임의의 숫자(가짜 가격, 가짜 거래량 등)를 표시하지 않습니다. 데이터 부재 시 명확히 `API 필요`, `오류` 등 상태 뱃지를 보여줍니다.
* **설명자로서의 AI**: AI는 투자 보조 설명자로서 역할하며, 임의로 수치를 창작(Hallucination)하지 않습니다.
* **시맨틱 디자인**: `DESIGN.md` 가이드라인에 맞춰 depth는 translucent border와 layered surface만으로 구현하며, box-shadow는 일절 사용하지 않습니다.
* **상승/하락의 로컬화**: 한국 금융 관례에 부합하도록 상승은 빨간색(`--kt-positive-text`), 하락은 파란색(`--kt-negative-text`)의 시맨틱 토큰만을 사용하여 UI에 바인딩합니다.

## 2. 개발 및 실행 환경
이 프로젝트는 **Next.js App Router**, **TypeScript strict mode**, **Tailwind CSS v4**를 기반으로 구축되었습니다.

### 시작하기 (Local Setup)

1. 의존성 설치:
```bash
npm install
```

2. 개발 서버 구동:
```bash
npm run dev
```
개발 서버 실행 후 [http://localhost:3000](http://localhost:3000)에서 터미널 쉘 화면을 확인하실 수 있습니다.

3. 타입 체크 및 린트 검증:
```bash
npm run typecheck
npm run lint
```

4. 테스트 실행 (Vitest):
```bash
npm run test
```

5. 프로덕션 빌드 검증:
```bash
npm run build
```

## 3. 구현 범위 (P0)
* **K-Terminal App Shell**: 상단 검색바, 인덱스 스트립, 좌측 관심종목 및 섹터 맵, 중앙 시세 차트 및 재무 테이블 공간, 우측 AI 분석 및 주문 패널(주문 불가 처리), 하단 진단 바.
* **초성 검색(Hangul Choseong Search)**: 한국 주식 종목명 검색 시 초성(예: 'ㅅㅅㅇㅈ' -> 삼성전자) 매칭을 완벽히 지원하는 검색 어댑터 구성.
* **공통 금융 데이터 계약(Data Contract)**: 모든 시세, 공시, 재무, 포트폴리오 데이터를 `DataEnvelope<T>` 구조로 래핑하여 상태와 출처를 보존.
* **API Adapter Interface**: 향후 OpenDART, SEC EDGAR, 시세 API를 얹을 수 있는 인터페이스 정의 및 API 미연결 시 `api_required`를 반환하는 디폴트 프로바이더 완비.
* **Strategy Signal Shell**: 표준편차 매매와 전략 합의 탭의 타입 계약, 데이터 부족 처리, veto 사유 표시를 고정했습니다. 실제 가격/재무 데이터가 없으면 신호나 점수를 생성하지 않습니다.
* **Quant Core Contract**: PIT 데이터 버전, atomic signal, factor definition, IC/ICIR, 단면 정규화, 팩터 공분산, 리스크 분해의 순수 계산 계약을 분리했습니다.
* **PIT / Universe Foundation**: in-memory/test-only PIT store, DataVersion store, AssetIdentity, UniverseSnapshot, seed demo universe 계약을 추가했습니다.

## 4. 현재 상태 (Current Status)
* Quant Core contracts exist.
* PIT store is in-memory/test-only.
* No real market data provider is connected.
* No real trading signal is produced.
* Seed demo data is not production data.
* Quote/OHLCV provider contracts and query keys exist, but live market APIs are still not connected.

## 5. 관련 상세 문서
* 아키텍처 및 폴더 구조: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
* 데이터 및 AI 수치 제한 정책: [docs/DATA_POLICY.md](docs/DATA_POLICY.md)
* PIT 데이터 정책: [docs/PIT_DATA_POLICY.md](docs/PIT_DATA_POLICY.md)
* 유니버스 정책: [docs/UNIVERSE_POLICY.md](docs/UNIVERSE_POLICY.md)
* Seed 데이터 정책: [docs/SEED_DATA_POLICY.md](docs/SEED_DATA_POLICY.md)
* 시장 데이터 Provider 정책: [docs/MARKET_DATA_PROVIDER.md](docs/MARKET_DATA_PROVIDER.md)
* 전략 신호 정책: [docs/STRATEGY_SIGNALS.md](docs/STRATEGY_SIGNALS.md)
* 퀀트 엔진 재설계: [docs/QUANT_REDESIGN_REPORT.md](docs/QUANT_REDESIGN_REPORT.md)
* 디자인 가이드 및 사용법: [docs/DESIGN_USAGE.md](docs/DESIGN_USAGE.md)
* 향후 로드맵: [docs/ROADMAP.md](docs/ROADMAP.md)
