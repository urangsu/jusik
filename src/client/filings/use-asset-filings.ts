import { useState, useEffect } from "react";
import { Asset } from "@/domain/market/asset";
import { DataEnvelope } from "@/domain/common/data-status";
import { Filing } from "@/domain/filing/filing";

export function useAssetFilings(asset: Asset | null) {
  const [filingsEnvelope, setFilingsEnvelope] = useState<DataEnvelope<Filing[]>>({
    value: null,
    status: "api_required",
    source: "filings-service",
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

    async function fetchFilings() {
      try {
        const provider = region === "KR" ? "opendart" : "sec_edgar";
        const res = await fetch(
          `/api/opendart/disclosures?symbol=${symbol}&provider=${provider}`,
          { signal: controller.signal }
        );

        if (res.ok && isMounted) {
          const data = await res.json();
          if (data.value !== undefined) setFilingsEnvelope(data);
        }
      } catch (err: any) {
        if (err.name === "AbortError") return;
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchFilings();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [asset?.id, asset?.symbol, asset?.region]);

  return { filingsEnvelope, loading };
}
