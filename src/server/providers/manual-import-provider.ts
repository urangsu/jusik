import { DataEnvelope } from "@/domain/common/data-status";
import { providerRegistry } from "./provider-registry";

export class ManualImportProvider {
  private providerId = "manual_import";

  async getImportedData(key: string): Promise<DataEnvelope<unknown>> {
    void key;
    if (!providerRegistry.isEnabled(this.providerId)) {
      return {
        value: null,
        status: "api_required",
        source: "Manual Import",
        sourceTier: "manual_import",
        warnings: ["manual_import_required"],
        updatedAt: null,
      };
    }

    return {
      value: null,
      status: "not_supported",
      source: "Manual Import",
      sourceTier: "manual_import",
      warnings: ["manual_import_required"],
      updatedAt: null,
      message: "Manual import data key is not supported or not uploaded.",
    };
  }
}

export const manualImportProvider = new ManualImportProvider();
