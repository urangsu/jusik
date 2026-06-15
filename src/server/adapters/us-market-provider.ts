import { MarketDataProvider } from "./types";
import { ApiRequiredProvider } from "./api-required-provider";

export class UsMarketProvider extends ApiRequiredProvider implements MarketDataProvider {
  constructor() {
    super("US-Market API");
  }
}
export const usMarketProvider = new UsMarketProvider();
