import { useState, useEffect } from "react";
import { Asset } from "@/domain/market/asset";
import { DataEnvelope } from "@/domain/common/data-status";

export function useAssetFinancials(asset: Asset | null) {
  const [statementEnvelope, setStatementEnvelope] = useState<DataEnvelope<any>>({
    value: null,
    status: "api_required",
    source: "financials-service",
    sourceTier: "official",
    warnings: [],
    updatedAt: null,
  });

  const [ratioEnvelope, setRatioEnvelope] = useState<DataEnvelope<any>>({
    value: null,
    status: "api_required",
    source: "financials-service",
    sourceTier: "official",
    warnings: [],
    updatedAt: null,
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!asset) return;

    const { symbol, region } = asset;
    let isMounted = true;
    setLoading(true);
    const controller = new AbortController();

    async function fetchFinancials() {
      try {
        const [stmtRes, ratioRes] = await Promise.all([
          fetch(
            `/api/financials/statements?symbol=${symbol}&region=${region}`,
            { signal: controller.signal }
          ),
          fetch(
            `/api/financials/ratios?symbol=${symbol}&region=${region}`,
            { signal: controller.signal }
          ),
        ]);

        if (stmtRes.ok && isMounted) {
          const sData = await stmtRes.json();
          if (sData.value !== undefined) setStatementEnvelope(sData);
        }

        if (ratioRes.ok && isMounted) {
          const rData = await ratioRes.json();
          if (rData.value !== undefined) setRatioEnvelope(rData);
        }
      } catch (err: any) {
        if (err.name === "AbortError") return;
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchFinancials();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [asset?.id, asset?.symbol, asset?.region]);

  return { statementEnvelope, ratioEnvelope, loading };
}
