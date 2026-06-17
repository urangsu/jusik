import { PROVIDERS, ProviderProfile } from "@/domain/source/provider-profile";
import { resolveProviderConfigSync } from "../settings/provider-config-resolver";
import { ProviderId } from "@/domain/settings/provider-id";

export class ProviderRegistry {
  private profiles: Map<string, ProviderProfile> = new Map();

  constructor() {
    PROVIDERS.forEach((p) => this.profiles.set(p.id, p));
  }

  public getProfile(id: string): ProviderProfile | undefined {
    return this.profiles.get(id);
  }

  public getProfiles(): ProviderProfile[] {
    return Array.from(this.profiles.values());
  }

  public isEnabled(id: string): boolean {
    const profile = this.profiles.get(id);
    if (!profile) return false;

    // Check strict personal fallback policy
    if (profile.tier === "personal_fallback") {
      const allowPersonal = process.env.ALLOW_PERSONAL_FALLBACK === "true";
      if (!allowPersonal) return false;

      if (id === "yfinance_personal") {
        return process.env.ENABLE_YFINANCE_PERSONAL === "true";
      }
      if (id === "stooq_personal") {
        return process.env.ENABLE_STOOQ_PERSONAL === "true";
      }
    }

    // Check manual import override
    if (id === "manual_import") {
      return process.env.ENABLE_KRX_MANUAL_IMPORT !== "false";
    }

    // Check API Key requirements
    if (profile.requiresApiKey) {
      const apiKeyVar = this.getApiKeyVarName(id);
      const key = process.env[apiKeyVar];
      if (!key) {
        let providerId: ProviderId;
        if (id === "kis") providerId = "kis";
        else if (id === "opendart") providerId = "opendart";
        else if (id === "fmp_free") providerId = "fmp";
        else if (id === "finnhub_free") providerId = "finnhub";
        else if (id === "alpha_vantage_free") providerId = "alpha_vantage";
        else return false;

        const resolvedConfig = resolveProviderConfigSync(providerId);
        if (!resolvedConfig[apiKeyVar]) {
          return false;
        }
      }
    }

    return profile.enabledByDefault;
  }

  private getApiKeyVarName(id: string): string {
    switch (id) {
      case "kis":
        return "KIS_APP_KEY";
      case "opendart":
        return "OPENDART_API_KEY";
      case "fmp_free":
        return "FMP_API_KEY";
      case "finnhub_free":
        return "FINNHUB_API_KEY";
      case "alpha_vantage_free":
        return "ALPHA_VANTAGE_API_KEY";
      default:
        return "";
    }
  }
}

export const providerRegistry = new ProviderRegistry();
