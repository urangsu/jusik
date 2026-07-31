import { useState, useEffect } from "react";
import { Asset } from "@/domain/market/asset";
import { Quote } from "@/domain/market/quote";
import { DataEnvelope } from "@/domain/common/data-status";

export function useAssetMarketData(asset: Asset | null) {
  const [quoteEnvelope, setQuoteEnvelope] = useState<DataEnvelope<Quote>>({
    value: null,
    status: "api_required",
    source: "market-data-service",
    sourceTier: "official",
    warnings: [],
    updatedAt: null,
  });

  const [ohlcvEnvelope, setOhlcvEnvelope] = useState<DataEnvelope<any>>({
    value: null,
    status: "api_required",
    source: "market-data-service",
    sourceTier: "official",
    warnings: [],
    updatedAt: null,
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!asset) {
      setQuoteEnvelope({
        value: null,
        status: "api_required",
        source: "market-data-service",
        sourceTier: "official",
        warnings: [],
        updatedAt: null,
      });
      setOhlcvEnvelope({
        value: null,
        status: "api_required",
        source: "market-data-service",
        sourceTier: "official",
        warnings: [],
        updatedAt: null,
      });
      return;
    }

    const { symbol, region, id } = asset;
    let isMounted = true;
    setLoading(true);

    const controller = new AbortController();

    async function fetchMarketData() {
      try {
        const [quoteRes, ohlcvRes] = await Promise.all([
          fetch(
            `/api/market/quote?symbol=${symbol}&region=${region}&assetId=${encodeURIComponent(id)}`,
            { signal: controller.signal }
          ),
          fetch(
            `/api/market/ohlcv?symbol=${symbol}&region=${region}&assetId=${encodeURIComponent(id)}&range=1Y&interval=1D`,
            { signal: controller.signal }
          ),
        ]);

        if (quoteRes.ok && isMounted) {
          const qData = await quoteRes.json();
          if (qData.value !== undefined) setQuoteEnvelope(qData);
        }

        if (ohlcvRes.ok && isMounted) {
          const oData = await ohlcvRes.json();
          if (oData.value !== undefined) setOhlcvEnvelope(oData);
        }
      } catch (err: any) {
        if (err.name === "AbortError") return;
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchMarketData();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [asset?.id, asset?.symbol, asset?.region]);

  return { quoteEnvelope, ohlcvEnvelope, loading };
}
