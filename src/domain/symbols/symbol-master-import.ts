import type { SymbolMasterRecord } from "./symbol-master";

export type SymbolMasterImportValidation = {
  validRecords: SymbolMasterRecord[];
  rejectedRecords: Array<{
    assetId: string | null;
    reason: string;
  }>;
};
