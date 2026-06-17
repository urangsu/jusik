import { NextRequest } from "next/server";
import { createSafeResponse } from "../../../../server/security/safe-api-response";
import { getFilingByReceiptNo } from "../../../../server/filings/filing-event-store";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ receiptNo: string }> }
) {
  try {
    const { receiptNo } = await params;
    const event = await getFilingByReceiptNo(receiptNo);

    if (!event) {
      return createSafeResponse({
        value: null,
        status: "not_found",
        source: "Filing Event Store",
        sourceTier: "official",
        warnings: [],
        updatedAt: null,
        message: `Receipt number [${receiptNo}] not found.`,
      }, 404);
    }

    return createSafeResponse({
      value: event,
      status: "cached",
      source: "Filing Event Store",
      sourceTier: "official",
      warnings: [],
      updatedAt: event.createdAt,
    });
  } catch (err: any) {
    return createSafeResponse({
      value: null,
      status: "error",
      source: "Filing Event Store",
      sourceTier: "official",
      warnings: [],
      updatedAt: null,
      message: err?.message || String(err),
    }, 500);
  }
}

export const dynamic = "force-dynamic";
