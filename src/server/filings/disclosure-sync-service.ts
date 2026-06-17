import { DataEnvelope } from "../../domain/common/data-status";
import { FilingEvent } from "../../domain/filings/filing-event";
import { OpenDartDisclosureType } from "../../domain/opendart/opendart-disclosure-type";
import { getCorpCodeByStockCode } from "../opendart/corp-code-store";
import { searchOpenDartDisclosures } from "../opendart/disclosure-search-client";
import { mapOpenDartListItemToFilingEvent } from "./open-dart-filing-mapper";
import { saveFilingEvents, getFilingByReceiptNo } from "./filing-event-store";
import { KOSPI_SAMPLE_CONSTITUENTS } from "../../domain/universe/market-universe";

export async function syncRecentDisclosures(params: {
  universeId?: "KOSPI_SAMPLE" | "SP500_SAMPLE";
  stockCode?: string;
  corpCode?: string;
  beginDate: string;
  endDate: string;
  disclosureType?: OpenDartDisclosureType;
  finalReportOnly?: boolean;
}): Promise<
  DataEnvelope<{
    fetched: number;
    saved: number;
    skipped: number;
    events: FilingEvent[];
  }>
> {
  const { universeId, beginDate, endDate, disclosureType, finalReportOnly } = params;

  if (universeId === "SP500_SAMPLE") {
    return {
      value: null,
      status: "not_supported",
      source: "OpenDART Sync Service",
      sourceTier: "official",
      warnings: [],
      updatedAt: new Date().toISOString(),
      message: "OpenDART는 한국 시장(KR) 종목만 지원합니다. SP500_SAMPLE은 지원하지 않습니다.",
    };
  }

  const eventsToSave: FilingEvent[] = [];
  let fetchedCount = 0;
  let savedCount = 0;
  let skippedCount = 0;

  const fetchAndProcess = async (corpCode: string, stockCode: string | null): Promise<string> => {
    const searchRes = await searchOpenDartDisclosures({
      corpCode,
      beginDate,
      endDate,
      disclosureType,
      finalReportOnly,
      pageCount: 100,
    });

    if ((searchRes.status === "eod" || searchRes.status === "not_found") && searchRes.value) {
      const items = searchRes.value.list || [];
      fetchedCount += items.length;

      for (const item of items) {
        const ev = mapOpenDartListItemToFilingEvent({
          item,
          disclosureType,
        });

        if (stockCode && !ev.stockCode) {
          ev.stockCode = stockCode;
        }

        const existing = await getFilingByReceiptNo(ev.receiptNo);
        if (existing) {
          skippedCount++;
        } else {
          savedCount++;
        }
        eventsToSave.push(ev);
      }
      return searchRes.status;
    }

    return searchRes.status;
  };

  try {
    if (params.stockCode) {
      const corpRecord = await getCorpCodeByStockCode(params.stockCode);
      if (!corpRecord) {
        return {
          value: null,
          status: "not_found",
          source: "OpenDART Sync Service",
          sourceTier: "official",
          warnings: [],
          updatedAt: new Date().toISOString(),
          message: `종목코드 [${params.stockCode}]에 해당하는 DART 고유번호를 찾을 수 없습니다. 고유번호를 먼저 가져오세요.`,
        };
      }
      const fetchStatus = await fetchAndProcess(corpRecord.corpCode, params.stockCode);
      if (fetchStatus !== "eod" && fetchStatus !== "not_found") {
        return {
          value: null,
          status: fetchStatus as any,
          source: "OpenDART Sync Service",
          sourceTier: "official",
          warnings: [],
          updatedAt: new Date().toISOString(),
          message: `OpenDART 동기화 실패: status=${fetchStatus}`,
        };
      }
    } else if (params.corpCode) {
      const fetchStatus = await fetchAndProcess(params.corpCode, null);
      if (fetchStatus !== "eod" && fetchStatus !== "not_found") {
        return {
          value: null,
          status: fetchStatus as any,
          source: "OpenDART Sync Service",
          sourceTier: "official",
          warnings: [],
          updatedAt: new Date().toISOString(),
          message: `OpenDART 동기화 실패: status=${fetchStatus}`,
        };
      }
    } else if (universeId === "KOSPI_SAMPLE") {
      for (const constituent of KOSPI_SAMPLE_CONSTITUENTS) {
        const corpRecord = await getCorpCodeByStockCode(constituent.symbol);
        if (corpRecord) {
          const fetchStatus = await fetchAndProcess(corpRecord.corpCode, constituent.symbol);
          if (fetchStatus !== "eod" && fetchStatus !== "not_found") {
            return {
              value: null,
              status: fetchStatus as any,
              source: "OpenDART Sync Service",
              sourceTier: "official",
              warnings: [],
              updatedAt: new Date().toISOString(),
              message: `OpenDART 동기화 실패 (${constituent.symbol}): status=${fetchStatus}`,
            };
          }
        }
      }
    } else {
      const dateRegex = /^\d{8}$/;
      if (!beginDate || !endDate || !dateRegex.test(beginDate) || !dateRegex.test(endDate)) {
        throw new Error("검색 기간(beginDate, endDate)은 YYYYMMDD 형식으로 필수 지정해야 합니다.");
      }
      const begin = parseDateString(beginDate);
      const end = parseDateString(endDate);
      if (getMonthDiff(begin, end) > 3) {
        throw new Error("corpCode 없이 시장 전체 검색 시 기간은 최대 3개월을 초과할 수 없습니다.");
      }

      const searchRes = await searchOpenDartDisclosures({
        beginDate,
        endDate,
        disclosureType,
        finalReportOnly,
        pageCount: 100,
      });

      if ((searchRes.status === "eod" || searchRes.status === "not_found") && searchRes.value) {
        const items = searchRes.value.list || [];
        fetchedCount += items.length;

        for (const item of items) {
          const ev = mapOpenDartListItemToFilingEvent({
            item,
            disclosureType,
          });
          const existing = await getFilingByReceiptNo(ev.receiptNo);
          if (existing) {
            skippedCount++;
          } else {
            savedCount++;
          }
          eventsToSave.push(ev);
        }
      } else {
        return {
          value: null,
          status: searchRes.status as any,
          source: "OpenDART Sync Service",
          sourceTier: "official",
          warnings: [],
          updatedAt: new Date().toISOString(),
          message: `OpenDART 동기화 실패: status=${searchRes.status}`,
        };
      }
    }

    if (eventsToSave.length > 0) {
      await saveFilingEvents(eventsToSave);
    }

    return {
      value: {
        fetched: fetchedCount,
        saved: savedCount,
        skipped: skippedCount,
        events: eventsToSave,
      },
      status: "eod",
      source: "OpenDART Sync Service",
      sourceTier: "official",
      warnings: [],
      updatedAt: new Date().toISOString(),
    };
  } catch (err: any) {
    return {
      value: null,
      status: "error",
      source: "OpenDART Sync Service",
      sourceTier: "official",
      warnings: [],
      updatedAt: new Date().toISOString(),
      message: err?.message || String(err),
    };
  }
}

function parseDateString(d: string): Date {
  const y = parseInt(d.substring(0, 4), 10);
  const m = parseInt(d.substring(4, 6), 10) - 1;
  const day = parseInt(d.substring(6, 8), 10);
  return new Date(y, m, day);
}

function getMonthDiff(d1: Date, d2: Date): number {
  return (d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24 * 30.5);
}
