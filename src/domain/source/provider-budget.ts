export type ProviderBudgetWindow = "second" | "minute" | "hour" | "day" | "month";

export type ProviderBudget = {
  providerId: string;
  window: ProviderBudgetWindow;
  limit: number | null;
  used: number;
  remaining: number | null;
  resetAt: string | null;
  isHardLimit: boolean;
  lastUpdatedAt: string;
};

export type BudgetStorageMode = "memory" | "sqlite" | "redis";
