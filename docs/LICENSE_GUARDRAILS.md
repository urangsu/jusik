# License Guardrails

K-Terminal은 다양한 금융 정보 수집 어댑터를 활용하며, 저작권 및 이용 약관(Terms of Service) 침해 리스크를 최소화하기 위해 다음 라이선스 가드레일을 준수합니다.

## 1. 라이선스 등급별 이용 가이드라인
* **공식 원천 (`official`)**:
  - OpenDART 및 SEC EDGAR 등은 공공 목적의 무료 API로 제공되나 가이드된 호출율 제한(예: OpenDART 일 1만회, SEC 10 requests/second)을 모니터링해야 합니다.
  - 상업적/비상업적 활용 범주를 수시로 재점검합니다.
* **무료 API 제한 등급 (`free_limited`)**:
  - Financial Modeling Prep, Finnhub, Alpha Vantage 등의 무료 티어는 원칙적으로 개인 비상업용(Personal Research) 목적으로 제한되며, 데이터의 2차 배포는 전면 금지되어 있습니다.
* **개인용 Fallback 등급 (`personal_fallback`)**:
  - `yfinance` 및 `Stooq` 데이터는 비공식 경로이며 어떠한 SLA(Service Level Agreement)도 보장되지 않습니다. 상용 서비스 배포 목적이 아닌, 개인 로컬 연구 목적으로만 국한됩니다.

## 2. Toss Securities 브랜드 자산 보호 및 도용 방지
* **브랜드 자산 미사용 원칙**: Toss 로고, Toss Securities 로고, 고유의 문구(Marketing taglines), 비공개 폰트 파일을 터미널 내부에 복제하거나 배포 패키지에 번들링하는 행위를 철저히 금지합니다.
* **시각 원칙의 참조적 준수**: `DESIGN.md` 상에 도출된 다크 테마(Overlay 300 `#202025` 등), 시맨틱 컬러 토큰(상승=빨강, 하락=파랑), box-shadow 금지 등의 추상 시각 원칙은 응용하여 사용하되, 토스증권의 전용 레이아웃 및 폼 시트 형태를 그대로 카피하지 않는 독창적인 화면을 유지합니다.

## 3. 웹 크롤링 및 우회 코드 금지 (Anti-Scraping Guards)
* yfinance 등을 활용한 데이터 취득 시, 다음의 불법 우회 기법의 작성을 금지합니다.
  - 야후의 Anti-bot 탐지를 회피하기 위해 `User-Agent` 문자열을 동적으로 순회(Rotation)하는 행위
  - 프록시 서버(Proxy IP)를 다중으로 배치하여 호출 제한을 강제로 bypass 하는 기법
  - Cloudflare 등의 보안 솔루션을 무력화하기 위한 헤더 해킹 코드 삽입
* 모든 비공식 데이터 요청은 기본 HTTP 클라이언트 규격을 따르며, 대상 서버가 속도 제한이나 연결 거부를 유발할 경우 즉시 실패(`rate_limited`, `error`)로 접수하고 호출을 정지합니다.
