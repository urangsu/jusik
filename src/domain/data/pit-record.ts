import { DataSourceKind } from "./data-source";

export type PitRecordStatus =
  | "valid"
  | "api_required"
  | "insufficient_data"
  | "stale"
  | "revised"
  | "superseded"
  | "error";

export type PitRecord<T> = {
  pitRecordId: string;
  assetId?: string;
  market: "KR" | "US" | "GLOBAL";
  sourceKind: DataSourceKind;
  value: T | null;
  asOfDate: string;
  effectiveAt: string;
  ingestedAt: string;
  dataVersionId: string;
  revisionId?: string;
  status: PitRecordStatus;
  source: string;
  sourceUrl?: string;
  hash: string;
};

const STRICT_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const CANONICAL_DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

function validateCanonicalPitTime(value: string, fieldName: string): void {
  if (!CANONICAL_DATETIME_RE.test(value)) {
    throw new Error(
      `${fieldName} must be a canonical UTC datetime with millisecond resolution and 'Z' timezone (e.g. YYYY-MM-DDTHH:mm:ss.sssZ).`
    );
  }
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    throw new Error(`${fieldName} has an invalid datetime.`);
  }
  const [datePart, timePart] = value.slice(0, 23).split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute, second] = timePart.split(":");
  const [sec, ms] = second.split(".");

  if (month < 1 || month > 12) throw new Error(`${fieldName} month must be 1-12.`);
  const maxDays = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day < 1 || day > maxDays) {
    throw new Error(`${fieldName} day is invalid for the given month.`);
  }
  if (Number(hour) < 0 || Number(hour) > 23) throw new Error(`${fieldName} hour must be 0-23.`);
  if (Number(minute) < 0 || Number(minute) > 59) {
    throw new Error(`${fieldName} minute must be 0-59.`);
  }
  if (Number(sec) < 0 || Number(sec) > 59) {
    throw new Error(`${fieldName} second must be 0-59.`);
  }
}

function validateCanonicalPitDate(value: string, fieldName: string): void {
  if (!STRICT_DATE_RE.test(value)) {
    throw new Error(`${fieldName} must be a strict YYYY-MM-DD date.`);
  }
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    throw new Error(`${fieldName} has an invalid date.`);
  }
  const [year, month, day] = value.split("-").map(Number);
  if (month < 1 || month > 12) throw new Error(`${fieldName} month must be 1-12.`);
  const maxDays = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day < 1 || day > maxDays) {
    throw new Error(`${fieldName} day is invalid for the given month.`);
  }
}

export function createPitRecord<T>(input: PitRecord<T>): PitRecord<T> {
  if (!input.dataVersionId) {
    throw new Error("PitRecord requires dataVersionId.");
  }
  validateCanonicalPitDate(input.asOfDate, "asOfDate");
  validateCanonicalPitTime(input.effectiveAt, "effectiveAt");
  validateCanonicalPitTime(input.ingestedAt, "ingestedAt");
  return { ...input };
}
