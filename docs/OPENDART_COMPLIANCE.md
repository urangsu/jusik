# OpenDART Compliance Policy

본 문서는 K-Terminal의 OpenDART 공시검색 API 연동 및 컴플라이언스 준수 방안을 설명합니다.

## 1. Zero Credential Leakage (자격 증명 유출 방지)

OpenDART API 인증에 사용되는 `OPENDART_API_KEY`는 엄격하게 서버 사이드 환경 변수로만 관리되어야 합니다.
- **클라이언트 번들 격리**: 브라우저나 클라이언트 사이드 코드에서 `process.env.OPENDART_API_KEY`가 직접 혹은 간접적으로 참조되거나 노출되는 일이 없어야 합니다.
- **로그 및 에러 마스킹**: API 호출 중에 에러가 발생하여 콘솔 로그나 예외 스택에 에러 메시지가 출력될 때, API Key가 포함된 전체 URL 파라미터(`crtfc_key=...`)가 그대로 출력되지 않도록 [opendart-http-client.ts](file:///Volumes/무제/jusik/src/server/opendart/opendart-http-client.ts) 내에서 정규식을 이용해 API Key를 `[REDACTED_API_KEY]`로 강제 치환 및 마스킹합니다.
- **API 응답 격리**: 외부 프록시 API 응답이나 데이터베이스 저장 데이터에 `crtfc_key`가 포함되지 않도록 보장합니다.

## 2. API Request Restrictions (요청 제한 제어)

과도한 OpenDART API 호출로 인한 차단 및 서버 리소스 오버헤드를 방지하기 위해 다음 요청 제어 규칙을 강제합니다:
- **검색 기간 제한**: 고유번호(`corpCode`)를 지정하지 않은 전체 공시검색을 수행할 경우, 조회 시작일(`beginDate`)과 종료일(`endDate`)의 간격은 **최대 3개월**로 제한됩니다. 3개월을 초과하는 경우 클라이언트에서 즉시 예외(Error)를 발생시킵니다.
- **페이지 크기 상한 (Clamping)**: 한 번의 API 요청으로 조회할 수 있는 페이지 당 문서 건수(`pageCount`)는 **최대 100건**으로 제한합니다. 100건을 초과하는 값이 전달되면 `100`으로 자동 조정(Clamp)됩니다.

## 3. Status Code Mapping (상태 코드 매핑)

OpenDART API 응답의 `status` 필드를 분석하여 K-Terminal의 공통 데이터 상태 규격인 `DataStatus`로 다음과 같이 정밀 매핑합니다:

| OpenDART Code | 설명 | K-Terminal DataStatus |
| --- | --- | --- |
| `000` | 정상 | `eod` |
| `013` | 조회된 데이터 없음 | `not_found` |
| `020`, `021` | 일일 요청 한도 초과 | `rate_limited` |
| `010`, `011`, `012`, `100`, `101`, `800`, `900` | 인증 에러, 파라미터 누락, 점검, 미정의 에러 | `error` |

## 4. Korean Asset Only (한국 주식 자산 전용)

- OpenDART API는 한국 시장(KR)에 상장되거나 등록된 회사 공시 정보만을 제공합니다.
- 이에 따라 미국 시장(US) 자산(예: `SP500_SAMPLE` 유니버스 구성원 등)에 대한 공시 연동 요청이 발생하면, 클라이언트 단에서 OpenDART API를 직접 호출하지 않고 `not_supported` 상태를 반환하도록 설계되었습니다.
