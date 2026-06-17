import { DataStatus } from "../common/data-status";
import { SourceWarning } from "../source/provider-tier";
import { OpenDartDisclosureType } from "../opendart/opendart-disclosure-type";

export type FilingEvent = {
  id: string;

  provider: "OpenDART";

  corpClass: "Y" | "K" | "N" | "E";
  corpName: string;
  corpCode: string;
  stockCode: string | null;

  reportName: string;
  receiptNo: string;
  filerName: string;
  receiptDate: string;       // YYYYMMDD

  dataAvailableAt: string;   // receiptDate 기반 ISO date
  filingUrl: string;

  remark: string | null;

  disclosureType: OpenDartDisclosureType | null;
  disclosureDetailType: string | null;

  dataStatus: DataStatus;
  source: "OpenDART";
  sourceTier: "official";
  warnings: SourceWarning[];

  createdAt: string;
};
