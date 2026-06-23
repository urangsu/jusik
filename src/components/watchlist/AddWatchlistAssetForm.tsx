import React, { useState } from "react";
import { useI18n } from "@/i18n/use-i18n";
import { Plus, Loader2 } from "lucide-react";
import { WatchlistItem } from "@/domain/watchlist/watchlist-item";

interface AddWatchlistAssetFormProps {
  onSuccess: (newItem: WatchlistItem) => void;
}

export const AddWatchlistAssetForm: React.FC<AddWatchlistAssetFormProps> = ({ onSuccess }) => {
  const { t, locale } = useI18n();
  const [market, setMarket] = useState<"KR" | "US">("KR");
  const [symbol, setSymbol] = useState("");
  const [nameKo, setNameKo] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [universeId, setUniverseId] = useState<"KOSPI_SAMPLE" | "SP500_SAMPLE" | "CUSTOM">("CUSTOM");
  const [tagsString, setTagsString] = useState("");
  const [alertEnabled, setAlertEnabled] = useState(true);
  const [reportInboxEnabled, setReportInboxEnabled] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol.trim()) {
      setError(locale === "ko" ? "종목 코드를 입력해주세요." : "Please enter a symbol.");
      return;
    }

    setLoading(true);
    setError(null);

    const assetId = `${market}:${symbol.trim()}`;
    const tags = tagsString
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    try {
      const res = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId,
          symbol: symbol.trim(),
          nameKo: nameKo.trim() || null,
          nameEn: nameEn.trim() || null,
          market,
          universeId,
          tags,
          alertEnabled,
          reportInboxEnabled,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Failed to add asset.");
      }

      // Reset form
      setSymbol("");
      setNameKo("");
      setNameEn("");
      setTagsString("");
      setUniverseId(market === "KR" ? "KOSPI_SAMPLE" : "SP500_SAMPLE");

      onSuccess(json.value);
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleMarketChange = (val: "KR" | "US") => {
    setMarket(val);
    setUniverseId(val === "KR" ? "KOSPI_SAMPLE" : "SP500_SAMPLE");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-5 bg-kt-bg-surface-100 border border-kt-border-panel rounded-kt-card space-y-4"
    >
      <h3 className="text-sm font-bold text-kt-text-primary">
        {locale === "ko" ? "관심종목 추가" : "Add Watchlist Asset"}
      </h3>

      {error && (
        <div className="p-3 text-xs bg-kt-positive-weak text-kt-positive-text rounded-kt-card">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[11px] text-kt-text-muted mb-1.5">
            {locale === "ko" ? "시장" : "Market"}
          </label>
          <div className="flex bg-kt-bg-overlay-300 rounded-kt-card p-0.5 border border-kt-border-panel">
            <button
              type="button"
              onClick={() => handleMarketChange("KR")}
              className={`flex-1 text-xs py-1.5 rounded-kt-card transition ${
                market === "KR"
                  ? "bg-kt-bg-surface-100 text-kt-text-primary"
                  : "text-kt-text-muted hover:text-kt-text-primary"
              }`}
            >
              KR
            </button>
            <button
              type="button"
              onClick={() => handleMarketChange("US")}
              className={`flex-1 text-xs py-1.5 rounded-kt-card transition ${
                market === "US"
                  ? "bg-kt-bg-surface-100 text-kt-text-primary"
                  : "text-kt-text-muted hover:text-kt-text-primary"
              }`}
            >
              US
            </button>
          </div>
        </div>

        <div>
          <label className="block text-[11px] text-kt-text-muted mb-1.5">
            {locale === "ko" ? "유니버스" : "Universe"}
          </label>
          <select
            value={universeId}
            onChange={(e) => setUniverseId(e.target.value as any)}
            className="w-full bg-kt-bg-overlay-300 border border-kt-border-panel text-xs text-kt-text-primary px-3 py-1.5 rounded-kt-card focus:outline-none focus:border-kt-text-muted/40 cursor-pointer"
          >
            {market === "KR" && <option value="KOSPI_SAMPLE">KOSPI_SAMPLE</option>}
            {market === "US" && <option value="SP500_SAMPLE">SP500_SAMPLE</option>}
            <option value="CUSTOM">CUSTOM</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[11px] text-kt-text-muted mb-1">
            {locale === "ko" ? "티커/종목코드" : "Symbol / Ticker"}
          </label>
          <input
            type="text"
            placeholder={market === "KR" ? "예: 005930" : "예: AAPL"}
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="w-full bg-kt-bg-overlay-300 border border-kt-border-panel text-xs text-kt-text-primary px-3 py-1.5 rounded-kt-card focus:outline-none focus:border-kt-text-muted/40"
          />
        </div>

        <div>
          <label className="block text-[11px] text-kt-text-muted mb-1">
            {locale === "ko" ? "태그 (쉼표 구분)" : "Tags (comma sep)"}
          </label>
          <input
            type="text"
            placeholder={locale === "ko" ? "예: 반도체, 대형주" : "e.g., Tech, Largecap"}
            value={tagsString}
            onChange={(e) => setTagsString(e.target.value)}
            className="w-full bg-kt-bg-overlay-300 border border-kt-border-panel text-xs text-kt-text-primary px-3 py-1.5 rounded-kt-card focus:outline-none focus:border-kt-text-muted/40"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[11px] text-kt-text-muted mb-1">
            {locale === "ko" ? "한글 종목명 (선택)" : "Korean Name (optional)"}
          </label>
          <input
            type="text"
            placeholder="예: 삼성전자"
            value={nameKo}
            onChange={(e) => setNameKo(e.target.value)}
            className="w-full bg-kt-bg-overlay-300 border border-kt-border-panel text-xs text-kt-text-primary px-3 py-1.5 rounded-kt-card focus:outline-none focus:border-kt-text-muted/40"
          />
        </div>

        <div>
          <label className="block text-[11px] text-kt-text-muted mb-1">
            {locale === "ko" ? "영문 종목명 (선택)" : "English Name (optional)"}
          </label>
          <input
            type="text"
            placeholder="e.g., Samsung Electronics"
            value={nameEn}
            onChange={(e) => setNameEn(e.target.value)}
            className="w-full bg-kt-bg-overlay-300 border border-kt-border-panel text-xs text-kt-text-primary px-3 py-1.5 rounded-kt-card focus:outline-none focus:border-kt-text-muted/40"
          />
        </div>
      </div>

      <div className="flex items-center justify-between py-1 bg-kt-bg-overlay-300 px-3 rounded-kt-card border border-kt-border-panel">
        <span className="text-[11px] text-kt-text-secondary">
          {locale === "ko" ? "인박스 리포트 수집 활성화" : "Enable Report Inbox"}
        </span>
        <input
          type="checkbox"
          checked={reportInboxEnabled}
          onChange={(e) => setReportInboxEnabled(e.target.checked)}
          className="w-4 h-4 cursor-pointer accent-kt-positive-text"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-kt-positive hover:bg-kt-positive-text disabled:opacity-50 text-white font-medium py-2 rounded-kt-card cursor-pointer transition text-xs"
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Plus className="w-3.5 h-3.5" />
        )}
        {locale === "ko" ? "종목 등록" : "Register Symbol"}
      </button>
    </form>
  );
};
