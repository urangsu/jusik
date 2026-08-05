import type {
  RuntimeProviderId,
  ProviderReadinessCheck,
  ProviderReadinessStatus,
} from "@/domain/ops/provider-readiness";
import { resolveProviderConfigSync } from "../settings/provider-config-resolver";
import { ProviderId } from "@/domain/settings/provider-id";
import { isMockKey } from "../providers/provider-registry";

export const RUNTIME_PROVIDER_SETTINGS = {
  kis: { settingsId: "kis", enabledKey: "KIS_ENABLED", requiredKeys: ["KIS_APP_KEY", "KIS_APP_SECRET"] },
  opendart: { settingsId: "opendart", enabledKey: "OPENDART_ENABLED", requiredKeys: ["OPENDART_API_KEY"] },
  finnhub_free: { settingsId: "finnhub", enabledKey: "FINNHUB_ENABLED", requiredKeys: ["FINNHUB_API_KEY"] },
} as const;

/**
 * Maps each RuntimeProviderId to its required + optional env keys.
 */
const PROVIDER_KEY_MAP: Record<
  RuntimeProviderId,
  { required: string[]; optional: string[] }
> = {
  kis: {
    required: ["KIS_APP_KEY", "KIS_APP_SECRET"],
    optional: ["KIS_ACCOUNT_NO", "KIS_IS_PAPER"],
  },
  opendart: {
    required: ["OPENDART_API_KEY"],
    optional: [],
  },
  fmp_free: {
    required: ["FMP_API_KEY"],
    optional: [],
  },
  finnhub_free: {
    required: ["FINNHUB_API_KEY"],
    optional: [],
  },
  alpha_vantage_free: {
    required: ["ALPHA_VANTAGE_API_KEY"],
    optional: [],
  },
  yfinance_personal: {
    required: ["ALLOW_PERSONAL_FALLBACK", "ENABLE_YFINANCE_PERSONAL"],
    optional: [],
  },
  stooq_personal: {
    required: ["ALLOW_PERSONAL_FALLBACK", "ENABLE_STOOQ_PERSONAL"],
    optional: [],
  },
};

const PROVIDER_DISPLAY_NAMES: Record<RuntimeProviderId, string> = {
  kis: "Korea Investment Securities (KIS) Open API",
  opendart: "OpenDART",
  fmp_free: "Financial Modeling Prep Free",
  finnhub_free: "Finnhub Free",
  alpha_vantage_free: "Alpha Vantage Free",
  yfinance_personal: "Yahoo Finance via yfinance (personal fallback)",
  stooq_personal: "Stooq (personal fallback)",
};

const PERSONAL_FALLBACK_PROVIDERS = new Set<RuntimeProviderId>([
  "yfinance_personal",
  "stooq_personal",
]);

/**
 * Checks whether an env key or a stored secret/setting has a non-empty value.
 * Returns the key NAME only — never the value.
 */
function isKeyConfigured(providerId: RuntimeProviderId, keyName: string): boolean {
  const val = process.env[keyName];
  const isSecret = keyName.endsWith("_KEY") || keyName.endsWith("_SECRET");

  if (typeof val === "string" && val.trim().length > 0) {
    if (isSecret && isMockKey(val)) {
      return false;
    }
    return true;
  }

  // Fallback to settings / secret store
  let domainProviderId: ProviderId;
  if (providerId === "kis") domainProviderId = "kis";
  else if (providerId === "opendart") domainProviderId = "opendart";
  else if (providerId === "fmp_free") domainProviderId = "fmp";
  else if (providerId === "finnhub_free") domainProviderId = "finnhub";
  else if (providerId === "alpha_vantage_free") domainProviderId = "alpha_vantage";
  else return false;

  try {
    const config = resolveProviderConfigSync(domainProviderId);
    const storeVal = config[keyName];
    if (typeof storeVal === "string" && storeVal.trim().length > 0) {
      if (isSecret && isMockKey(storeVal)) {
        return false;
      }
      return true;
    }
    if (typeof storeVal === "boolean") {
      return storeVal;
    }
    return false;
  } catch {
    return false;
  }
}

function resolveStatus(
  providerId: RuntimeProviderId,
  missingKeys: string[]
): { status: ProviderReadinessStatus; message: string | null } {
  // Personal fallback: requires explicit opt-in flags
  if (PERSONAL_FALLBACK_PROVIDERS.has(providerId)) {
    const allowPersonal = isKeyConfigured(providerId, "ALLOW_PERSONAL_FALLBACK") &&
      process.env.ALLOW_PERSONAL_FALLBACK === "true";

    if (!allowPersonal) {
      return {
        status: "personal_fallback_disabled",
        message:
          "ALLOW_PERSONAL_FALLBACK=true 설정 없이는 personal fallback이 실행되지 않습니다.",
      };
    }

    const enableFlag =
      providerId === "yfinance_personal"
        ? "ENABLE_YFINANCE_PERSONAL"
        : "ENABLE_STOOQ_PERSONAL";

    if (
      !isKeyConfigured(providerId, enableFlag) ||
      process.env[enableFlag] !== "true"
    ) {
      return {
        status: "personal_fallback_disabled",
        message: `${enableFlag}=true 설정 없이는 실행되지 않습니다.`,
      };
    }

    return { status: "ready", message: null };
  }

  if (missingKeys.length > 0) {
    return {
      status: "not_configured",
      message: `필수 설정값 누락: ${missingKeys.join(", ")}`,
    };
  }

  return { status: "ready", message: null };
}

/**
 * Resolves the configuration readiness of all runtime providers.
 *
 * Security contract:
 * - key values are NEVER returned
 * - only key names (configured / missing) are reported
 * - secretsExposed is always false
 */
export function resolveProviderReadiness(): ProviderReadinessCheck[] {
  const now = new Date().toISOString();
  const checks: ProviderReadinessCheck[] = [];

  const providerIds = Object.keys(PROVIDER_KEY_MAP) as RuntimeProviderId[];

  for (const providerId of providerIds) {
    const { required } = PROVIDER_KEY_MAP[providerId];

    const configuredKeys = required.filter((k) => isKeyConfigured(providerId, k));
    const missingKeys = required.filter((k) => !isKeyConfigured(providerId, k));

    const { status, message } = resolveStatus(providerId, missingKeys);

    const canRunSmoke = status === "ready";

    checks.push({
      providerId,
      displayName: PROVIDER_DISPLAY_NAMES[providerId],
      requiredKeys: required,
      configuredKeys,
      missingKeys,
      secretsExposed: false,
      status,
      message,
      canRunSmoke: canRunSmoke && status === "ready",
      checkedAt: now,
    });
  }

  return checks;
}
