import { MarketDataProvider } from "./types";
import { ApiRequiredProvider } from "./api-required-provider";

export class KrMarketProvider extends ApiRequiredProvider implements MarketDataProvider {
  constructor() {
    super("KR-Market API");
  }
}
export const krMarketProvider = new KrMarketProvider();
