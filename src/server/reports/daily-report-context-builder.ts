import { MarketBoardSnapshot } from "@/domain/market-board/market-board-snapshot";
import { AlertEvent } from "@/domain/alerts/alert-event";
import { ProviderBudget } from "@/domain/source/provider-budget";
import { ProviderHealthState, providerHealthStore } from "../providers/provider-health-store";
import { loadMarketBoardSnapshot } from "../snapshots/market-board-snapshot-loader";
import { alertEventStore } from "../alerts/alert-event-store";
import { providerBudgetManager } from "../providers/provider-budget-manager";

export type DailyReportContext = {
  reportDate: string;
  kospiSnapshot: MarketBoardSnapshot;
  sp500Snapshot: MarketBoardSnapshot;
  events: AlertEvent[];
  budgets: ProviderBudget[];
  healths: Record<string, ProviderHealthState>;
  isTradingDay: boolean;
};

export class DailyReportContextBuilder {
  async buildContext(reportDate: string, force = false): Promise<DailyReportContext> {
    const kospiSnapshot = await loadMarketBoardSnapshot("KOSPI_SAMPLE");
    const sp500Snapshot = await loadMarketBoardSnapshot("SP500_SAMPLE");

    const allEvents = await alertEventStore.getEvents();
    const events = allEvents.filter((e) => e.createdAt.startsWith(reportDate));

    const budgets = providerBudgetManager.getBudgetsList();
    const healths = await providerHealthStore.getAllHealth();

    // Check if it's a weekend (non-trading day) by default
    const dateObj = new Date(reportDate);
    const dayOfWeek = dateObj.getDay(); // 0 is Sunday, 6 is Saturday
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    let isTradingDay = !isWeekend;
    if (force) {
      isTradingDay = true;
    }

    return {
      reportDate,
      kospiSnapshot,
      sp500Snapshot,
      events,
      budgets,
      healths,
      isTradingDay,
    };
  }
}

export const dailyReportContextBuilder = new DailyReportContextBuilder();
