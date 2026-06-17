import { ProviderId } from "./provider-id";

export type ProviderSettingFieldType =
  | "text"
  | "password"
  | "number"
  | "boolean"
  | "select";

export type ProviderSettingField = {
  key: string;
  labelKo: string;
  labelEn: string;
  type: ProviderSettingFieldType;
  required: boolean;
  secret: boolean;
  placeholder?: string;
  defaultValue?: string | number | boolean;
  helpTextKo?: string;
  helpTextEn?: string;
};

export type ProviderSettingDefinition = {
  providerId: ProviderId;
  displayName: string;
  descriptionKo: string;
  descriptionEn: string;
  fields: ProviderSettingField[];
  healthCheckSupported: boolean;
  writeSupportedInProduction: boolean;
};

export const PROVIDER_SETTING_DEFINITIONS: ProviderSettingDefinition[] = [
  {
    providerId: "opendart",
    displayName: "OpenDART",
    descriptionKo: "금융감독원 전자공시시스템 OpenDART 서비스 설정",
    descriptionEn: "Financial Supervisory Service OpenDART Disclosure System settings",
    healthCheckSupported: true,
    writeSupportedInProduction: true,
    fields: [
      {
        key: "OPENDART_ENABLED",
        labelKo: "OpenDART 활성화",
        labelEn: "Enable OpenDART",
        type: "boolean",
        required: true,
        secret: false,
        defaultValue: false,
      },
      {
        key: "OPENDART_API_KEY",
        labelKo: "인증키 (API Key)",
        labelEn: "API Key",
        type: "password",
        required: true,
        secret: true,
        placeholder: "OpenDART API Key",
      },
      {
        key: "OPENDART_BASE_URL",
        labelKo: "API 기본 URL",
        labelEn: "API Base URL",
        type: "text",
        required: true,
        secret: false,
        defaultValue: "https://opendart.fss.or.kr/api",
      },
      {
        key: "OPENDART_DISCLOSURE_PAGE_COUNT",
        labelKo: "페이지당 노출 수 (최대 100)",
        labelEn: "Page Count (Max 100)",
        type: "number",
        required: true,
        secret: false,
        defaultValue: 100,
      },
      {
        key: "OPENDART_REQUEST_TIMEOUT_MS",
        labelKo: "요청 타임아웃 (ms)",
        labelEn: "Request Timeout (ms)",
        type: "number",
        required: true,
        secret: false,
        defaultValue: 10000,
      },
    ],
  },
  {
    providerId: "kis",
    displayName: "Korea Investment & Securities",
    descriptionKo: "한국투자증권 Open API 연동 설정",
    descriptionEn: "Korea Investment & Securities Open API integration settings",
    healthCheckSupported: true,
    writeSupportedInProduction: true,
    fields: [
      {
        key: "KIS_ENABLED",
        labelKo: "KIS API 활성화",
        labelEn: "Enable KIS API",
        type: "boolean",
        required: true,
        secret: false,
        defaultValue: false,
      },
      {
        key: "KIS_APP_KEY",
        labelKo: "앱키 (App Key)",
        labelEn: "App Key",
        type: "password",
        required: true,
        secret: true,
      },
      {
        key: "KIS_APP_SECRET",
        labelKo: "앱시크릿 (App Secret)",
        labelEn: "App Secret",
        type: "password",
        required: true,
        secret: true,
      },
      {
        key: "KIS_ACCOUNT_NO",
        labelKo: "종합계좌번호 (8자리)",
        labelEn: "Account Number (8 digits)",
        type: "text",
        required: true,
        secret: false,
      },
      {
        key: "KIS_ACCOUNT_PRODUCT_CODE",
        labelKo: "계좌상품코드 (2자리)",
        labelEn: "Account Product Code (2 digits)",
        type: "text",
        required: true,
        secret: false,
        defaultValue: "01",
      },
      {
        key: "KIS_IS_PAPER",
        labelKo: "모의투자 여부",
        labelEn: "Is Paper Trading",
        type: "boolean",
        required: true,
        secret: false,
        defaultValue: true,
      },
      {
        key: "KIS_BASE_URL",
        labelKo: "API 기본 URL",
        labelEn: "API Base URL",
        type: "text",
        required: true,
        secret: false,
        defaultValue: "https://openapivts.koreainvestment.com",
      },
    ],
  },
  {
    providerId: "fmp",
    displayName: "Financial Modeling Prep",
    descriptionKo: "FMP 금융 데이터 서비스 설정",
    descriptionEn: "Financial Modeling Prep API settings",
    healthCheckSupported: false,
    writeSupportedInProduction: true,
    fields: [
      {
        key: "FMP_ENABLED",
        labelKo: "FMP 활성화",
        labelEn: "Enable FMP",
        type: "boolean",
        required: true,
        secret: false,
        defaultValue: false,
      },
      {
        key: "FMP_API_KEY",
        labelKo: "API Key",
        labelEn: "API Key",
        type: "password",
        required: true,
        secret: true,
      },
    ],
  },
  {
    providerId: "finnhub",
    displayName: "Finnhub",
    descriptionKo: "Finnhub 데이터 API 서비스 설정",
    descriptionEn: "Finnhub API settings",
    healthCheckSupported: false,
    writeSupportedInProduction: true,
    fields: [
      {
        key: "FINNHUB_ENABLED",
        labelKo: "Finnhub 활성화",
        labelEn: "Enable Finnhub",
        type: "boolean",
        required: true,
        secret: false,
        defaultValue: false,
      },
      {
        key: "FINNHUB_API_KEY",
        labelKo: "API Key",
        labelEn: "API Key",
        type: "password",
        required: true,
        secret: true,
      },
    ],
  },
  {
    providerId: "alpha_vantage",
    displayName: "Alpha Vantage",
    descriptionKo: "Alpha Vantage 데이터 서비스 설정",
    descriptionEn: "Alpha Vantage API settings",
    healthCheckSupported: false,
    writeSupportedInProduction: true,
    fields: [
      {
        key: "ALPHA_VANTAGE_ENABLED",
        labelKo: "Alpha Vantage 활성화",
        labelEn: "Enable Alpha Vantage",
        type: "boolean",
        required: true,
        secret: false,
        defaultValue: false,
      },
      {
        key: "ALPHA_VANTAGE_API_KEY",
        labelKo: "API Key",
        labelEn: "API Key",
        type: "password",
        required: true,
        secret: true,
      },
    ],
  },
  {
    providerId: "telegram",
    displayName: "Telegram Bot",
    descriptionKo: "텔레그램 봇 알림 수신 설정",
    descriptionEn: "Telegram Bot notification settings",
    healthCheckSupported: false,
    writeSupportedInProduction: true,
    fields: [
      {
        key: "TELEGRAM_ENABLED",
        labelKo: "텔레그램 활성화",
        labelEn: "Enable Telegram",
        type: "boolean",
        required: true,
        secret: false,
        defaultValue: false,
      },
      {
        key: "TELEGRAM_BOT_TOKEN",
        labelKo: "봇 토큰 (Bot Token)",
        labelEn: "Bot Token",
        type: "password",
        required: true,
        secret: true,
      },
      {
        key: "TELEGRAM_ALLOWED_CHAT_IDS",
        labelKo: "허용된 채팅 ID 목록 (쉼표 구분)",
        labelEn: "Allowed Chat IDs (comma-separated)",
        type: "text",
        required: false,
        secret: false,
      },
    ],
  },
  {
    providerId: "email",
    displayName: "Email SMTP",
    descriptionKo: "이메일 알림 발송용 SMTP 서버 설정",
    descriptionEn: "Email notification SMTP server settings",
    healthCheckSupported: false,
    writeSupportedInProduction: true,
    fields: [
      {
        key: "EMAIL_ENABLED",
        labelKo: "이메일 알림 활성화",
        labelEn: "Enable Email Alerts",
        type: "boolean",
        required: true,
        secret: false,
        defaultValue: false,
      },
      {
        key: "SMTP_HOST",
        labelKo: "SMTP 호스트 주소",
        labelEn: "SMTP Host Address",
        type: "text",
        required: true,
        secret: false,
      },
      {
        key: "SMTP_PORT",
        labelKo: "SMTP 포트 번호",
        labelEn: "SMTP Port Number",
        type: "number",
        required: true,
        secret: false,
        defaultValue: 587,
      },
      {
        key: "SMTP_USER",
        labelKo: "SMTP 사용자 계정",
        labelEn: "SMTP User",
        type: "text",
        required: true,
        secret: false,
      },
      {
        key: "SMTP_PASSWORD",
        labelKo: "SMTP 비밀번호",
        labelEn: "SMTP Password",
        type: "password",
        required: true,
        secret: true,
      },
      {
        key: "EMAIL_FROM",
        labelKo: "발신자 이메일 주소",
        labelEn: "Sender Email Address",
        type: "text",
        required: true,
        secret: false,
      },
    ],
  },
  {
    providerId: "llm",
    displayName: "LLM Provider",
    descriptionKo: "대화형 설명용 LLM (OpenAI 등) 연동 설정",
    descriptionEn: "Interactive LLM (OpenAI etc.) settings for explanations",
    healthCheckSupported: false,
    writeSupportedInProduction: true,
    fields: [
      {
        key: "INTERACTIVE_LLM_ENABLED",
        labelKo: "LLM 기능 활성화",
        labelEn: "Enable LLM Features",
        type: "boolean",
        required: true,
        secret: false,
        defaultValue: false,
      },
      {
        key: "OPENAI_API_KEY",
        labelKo: "OpenAI API Key",
        labelEn: "OpenAI API Key",
        type: "password",
        required: true,
        secret: true,
      },
      {
        key: "INTERACTIVE_LLM_DAILY_CALL_LIMIT",
        labelKo: "일일 호출 한도",
        labelEn: "Daily Call Limit",
        type: "number",
        required: true,
        secret: false,
        defaultValue: 100,
      },
      {
        key: "INTERACTIVE_LLM_MONTHLY_BUDGET_USD",
        labelKo: "월간 예산 한도 (USD)",
        labelEn: "Monthly Budget (USD)",
        type: "number",
        required: true,
        secret: false,
        defaultValue: 10,
      },
    ],
  },
];
