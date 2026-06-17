# Provider API Settings Center

본 문서는 K-Terminal의 데이터 공급자 API 키 및 설정을 입력, 관리 및 검증하는 **Provider API Settings Center**의 세부 사양을 다룹니다.

## 1. 목적 (Purpose)

K-Terminal은 다양한 금융 데이터 공급자(KIS, OpenDART, FMP 등) 및 외부 채널(Telegram, Email 등)과 연동됩니다. 각 외부 서비스는 인증키(API Key) 또는 호스트 설정이 필요하지만, 보안상 이들을 소스코드나 브라우저 번들에 포함할 수 없습니다.  
이에 따라 사용자가 UI 설정 화면에서 안전하게 키를 입력 및 관리하고 연결 상태를 진단할 수 있도록 API 설정 센터를 구축했습니다.

## 2. 연동 대상 공급자 (API Providers)

| Provider ID | 표시 명칭 | 용도 | 주요 설정 항목 |
| --- | --- | --- | --- |
| `opendart` | OpenDART | 한국 상장사 공시 수집 | `OPENDART_API_KEY`, `OPENDART_ENABLED` |
| `kis` | Korea Investment & Securities | 한국 주식 호가 및 OHLCV 데이터 수집 | `KIS_APP_KEY`, `KIS_APP_SECRET`, `KIS_ACCOUNT_NO` |
| `fmp` | Financial Modeling Prep | 미국 주식 시세 및 재무 데이터 수집 | `FMP_API_KEY`, `FMP_ENABLED` |
| `finnhub` | Finnhub | 미국 주식 시세 및 뉴스 수집 | `FINNHUB_API_KEY`, `FINNHUB_ENABLED` |
| `alpha_vantage` | Alpha Vantage | 미국 주식 시세 및 거시 데이터 수집 | `ALPHA_VANTAGE_API_KEY`, `ALPHA_VANTAGE_ENABLED` |
| `telegram` | Telegram Bot | 실시간 알림 발송 채널 | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ALLOWED_CHAT_IDS` |
| `email` | Email SMTP | 일간 리포트 및 주요 알림 메일 발송 | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` |
| `llm` | LLM Provider | 뉴스 요약, 시황 분석용 LLM 연동 | `OPENAI_API_KEY`, `INTERACTIVE_LLM_ENABLED` |

## 3. UI 및 사용성 정책 (UI/UX Policy)

- **설정 입력 양식**: [ProviderApiSettingsPanel.tsx](file:///Volumes/무제/jusik/src/components/settings/ProviderApiSettingsPanel.tsx)는 모든 공급자의 설정 카드 리스트를 출력하며, 각 설정 항목의 스펙에 맞게 동적으로 텍스트, 숫자, 비밀키, 체크박스 필드를 렌더링합니다.
- **비밀키 마스킹**: 보안 입력 필드([SecretInput.tsx](file:///Volumes/무제/jusik/src/components/settings/SecretInput.tsx))는 비밀키를 브라우저 상에 절대 평문으로 노출하지 않으며, 이미 기입된 비밀키는 마스킹 처리된 placeholder로만 렌더링됩니다.
- **연결 테스트 (Health Check)**: 각 설정 카드 우측 하단의 "연결 테스트" 버튼을 통해 서버로 Health check 요청을 보내어 실제 연동 유효성을 판독 및 뱃지로 출력합니다.
- **에러 전파**: 연결 실패 시의 상세 에러 로그 및 메시지가 진단 결과 섹션에 표시됩니다.
