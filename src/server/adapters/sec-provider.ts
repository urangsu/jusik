import { FilingProvider, FinancialProvider } from "./types";
import { ApiRequiredProvider } from "./api-required-provider";

export class SecProvider extends ApiRequiredProvider implements FilingProvider, FinancialProvider {
  constructor() {
    super("SEC EDGAR API");
  }
}
export const secProvider = new SecProvider();
