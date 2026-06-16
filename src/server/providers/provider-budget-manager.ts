import { ProviderBudget } from "@/domain/source/provider-budget";

export class ProviderBudgetManager {
  private budgets: Map<string, ProviderBudget> = new Map();

  constructor() {
    this.initializeBudgets();
  }

  private initializeBudgets() {
    // Read limits from env, fallback to public doc baseline defaults
    const fmpLimit = process.env.FMP_DAILY_LIMIT ? parseInt(process.env.FMP_DAILY_LIMIT, 10) : 250;
    const avLimit = process.env.ALPHA_VANTAGE_DAILY_LIMIT ? parseInt(process.env.ALPHA_VANTAGE_DAILY_LIMIT, 10) : 25;
    const finnhubLimit = process.env.FINNHUB_MINUTE_LIMIT ? parseInt(process.env.FINNHUB_MINUTE_LIMIT, 10) : 60;

    const now = new Date().toISOString();

    this.budgets.set("opendart", {
      providerId: "opendart",
      window: "day",
      limit: 10000,
      used: 0,
      remaining: 10000,
      resetAt: null,
      isHardLimit: true,
      lastUpdatedAt: now
    });

    this.budgets.set("sec_edgar", {
      providerId: "sec_edgar",
      window: "second",
      limit: 10,
      used: 0,
      remaining: 10,
      resetAt: null,
      isHardLimit: true,
      lastUpdatedAt: now
    });

    this.budgets.set("fmp_free", {
      providerId: "fmp_free",
      window: "day",
      limit: fmpLimit,
      used: 0,
      remaining: fmpLimit,
      resetAt: null,
      isHardLimit: true,
      lastUpdatedAt: now
    });

    this.budgets.set("finnhub_free", {
      providerId: "finnhub_free",
      window: "minute",
      limit: finnhubLimit,
      used: 0,
      remaining: finnhubLimit,
      resetAt: null,
      isHardLimit: true,
      lastUpdatedAt: now
    });

    this.budgets.set("alpha_vantage_free", {
      providerId: "alpha_vantage_free",
      window: "day",
      limit: avLimit,
      used: 0,
      remaining: avLimit,
      resetAt: null,
      isHardLimit: true,
      lastUpdatedAt: now
    });

    this.budgets.set("yfinance_personal", {
      providerId: "yfinance_personal",
      window: "hour",
      limit: null,
      used: 0,
      remaining: null,
      resetAt: null,
      isHardLimit: false,
      lastUpdatedAt: now
    });

    this.budgets.set("stooq_personal", {
      providerId: "stooq_personal",
      window: "day",
      limit: null,
      used: 0,
      remaining: null,
      resetAt: null,
      isHardLimit: false,
      lastUpdatedAt: now
    });
  }

  public getBudget(providerId: string): ProviderBudget | undefined {
    return this.budgets.get(providerId);
  }

  public getBudgetsList(): ProviderBudget[] {
    return Array.from(this.budgets.values());
  }

  public isAllowed(providerId: string): boolean {
    const budget = this.budgets.get(providerId);
    if (!budget) return true; // Unregulated manual/internal sources

    if (budget.limit !== null && budget.used >= budget.limit) {
      return false;
    }
    return true;
  }

  public consume(providerId: string): boolean {
    const budget = this.budgets.get(providerId);
    if (!budget) return true;

    if (budget.limit !== null && budget.used >= budget.limit) {
      return false;
    }

    budget.used += 1;
    if (budget.limit !== null) {
      budget.remaining = budget.limit - budget.used;
    }
    budget.lastUpdatedAt = new Date().toISOString();
    return true;
  }

  public resetBudget(providerId: string) {
    const budget = this.budgets.get(providerId);
    if (budget) {
      budget.used = 0;
      if (budget.limit !== null) {
        budget.remaining = budget.limit;
      }
      budget.lastUpdatedAt = new Date().toISOString();
    }
  }
}

export const providerBudgetManager = new ProviderBudgetManager();
