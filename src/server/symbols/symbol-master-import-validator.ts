import type { SymbolMasterImportValidation } from "@/domain/symbols/symbol-master-import";
import type { SymbolMasterRecord } from "@/domain/symbols/symbol-master";

export function validateSymbolMasterImport(records: SymbolMasterRecord[]): SymbolMasterImportValidation {
  const validRecords: SymbolMasterRecord[] = [];
  const rejectedRecords: SymbolMasterImportValidation["rejectedRecords"] = [];

  for (const record of records) {
    if (record.market === "KR" && !record.assetId.startsWith("KR_")) {
      rejectedRecords.push({ assetId: record.assetId ?? null, reason: "KR records require KR_ assetId prefix." });
      continue;
    }
    if (record.market === "US" && !record.assetId.startsWith("US_")) {
      rejectedRecords.push({ assetId: record.assetId ?? null, reason: "US records require US_ assetId prefix." });
      continue;
    }
    if (record.market === "KR" && record.currency !== "KRW") {
      rejectedRecords.push({ assetId: record.assetId, reason: "KR records require KRW currency." });
      continue;
    }
    if (record.market === "US" && record.currency !== "USD") {
      rejectedRecords.push({ assetId: record.assetId, reason: "US records require USD currency." });
      continue;
    }
    validRecords.push(record);
  }

  return { validRecords, rejectedRecords };
}
