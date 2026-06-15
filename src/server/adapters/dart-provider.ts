import { FilingProvider, FinancialProvider } from "./types";
import { ApiRequiredProvider } from "./api-required-provider";

export class DartProvider extends ApiRequiredProvider implements FilingProvider, FinancialProvider {
  constructor() {
    super("DART API");
  }
}
export const dartProvider = new DartProvider();
