import { PROVIDERS, ProviderProfile } from "@/domain/source/provider-profile";

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
      if (!key) return false;
    }

    return profile.enabledByDefault;
  }

  private getApiKeyVarName(id: string): string {
    switch (id) {
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
