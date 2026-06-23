import React, { useState } from "react";
import { useI18n } from "@/i18n/use-i18n";
import { Trash2, Loader2, Bell, BellOff, Inbox, EyeOff } from "lucide-react";
import { WatchlistItem } from "@/domain/watchlist/watchlist-item";

interface WatchlistTableProps {
  items: WatchlistItem[];
  onRemove: (assetId: string) => void;
  onUpdate: (updated: WatchlistItem) => void;
}

export const WatchlistTable: React.FC<WatchlistTableProps> = ({ items, onRemove, onUpdate }) => {
  const { t, locale } = useI18n();
  const [updatingAssetId, setUpdatingAssetId] = useState<string | null>(null);

  const handleToggleInbox = async (item: WatchlistItem) => {
    setUpdatingAssetId(item.assetId);
    try {
      const targetVal = !item.reportInboxEnabled;
      const res = await fetch(`/api/watchlist/${encodeURIComponent(item.assetId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportInboxEnabled: targetVal }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to update item.");
      onUpdate(json.value);
    } catch (err) {
      alert(err || "Failed to update");
    } finally {
      setUpdatingAssetId(null);
    }
  };

  const handleDelete = async (assetId: string) => {
    if (!confirm(locale === "ko" ? "정말 관심종목에서 삭제하시겠습니까?" : "Are you sure you want to remove this asset?")) {
      return;
    }
    setUpdatingAssetId(assetId);
    try {
      const res = await fetch(`/api/watchlist/${encodeURIComponent(assetId)}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to delete item.");
      onRemove(assetId);
    } catch (err) {
      alert(err || "Failed to delete");
    } finally {
      setUpdatingAssetId(null);
    }
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-kt-bg-surface-100 border border-kt-border-panel rounded-kt-card text-kt-text-muted text-xs">
        <EyeOff className="w-8 h-8 mb-2 opacity-50" />
        {locale === "ko" ? "등록된 관심종목이 없습니다." : "No watched symbols registered."}
      </div>
    );
  }

  return (
    <div className="bg-kt-bg-surface-100 border border-kt-border-panel rounded-kt-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-kt-border-panel bg-kt-bg-overlay-300 text-kt-text-muted font-medium">
              <th className="p-3">{locale === "ko" ? "종목" : "Symbol"}</th>
              <th className="p-3">{locale === "ko" ? "종목명" : "Name"}</th>
              <th className="p-3">{locale === "ko" ? "시장" : "Market"}</th>
              <th className="p-3">{locale === "ko" ? "유니버스" : "Universe"}</th>
              <th className="p-3">{locale === "ko" ? "태그" : "Tags"}</th>
              <th className="p-3 text-center">{locale === "ko" ? "수집 활성화" : "Inbox Active"}</th>
              <th className="p-3 text-center">{locale === "ko" ? "관리" : "Action"}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const name = locale === "ko" ? item.nameKo || item.nameEn : item.nameEn || item.nameKo;
              const isUpdating = updatingAssetId === item.assetId;

              return (
                <tr key={item.assetId} className="border-b border-kt-border-panel/40 hover:bg-kt-bg-overlay-300/40 transition">
                  <td className="p-3 font-semibold text-kt-text-primary tabular-nums">
                    {item.symbol}
                  </td>
                  <td className="p-3 text-kt-text-secondary">
                    {name || "-"}
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-kt-pill text-[10px] ${
                      item.market === "KR" ? "bg-kt-positive-weak text-kt-positive-text" : "bg-kt-negative-weak text-kt-negative-text"
                    }`}>
                      {item.market}
                    </span>
                  </td>
                  <td className="p-3 text-[10px] text-kt-text-muted">
                    {item.universeId}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {item.tags.map((t) => (
                        <span key={t} className="px-1.5 py-0.5 rounded-kt-card bg-kt-bg-overlay-300 text-kt-text-muted text-[10px] border border-kt-border-panel">
                          {t}
                        </span>
                      ))}
                      {item.tags.length === 0 && <span className="text-kt-text-muted">-</span>}
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => handleToggleInbox(item)}
                      disabled={isUpdating}
                      className="mx-auto flex items-center justify-center p-1 rounded-kt-card bg-kt-bg-overlay-300 hover:bg-kt-bg-body text-kt-text-secondary disabled:opacity-50 cursor-pointer border border-kt-border-panel"
                    >
                      {item.reportInboxEnabled ? (
                        <Inbox className="w-3.5 h-3.5 text-kt-positive-text" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5 opacity-40" />
                      )}
                    </button>
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => handleDelete(item.assetId)}
                      disabled={isUpdating}
                      className="mx-auto flex items-center justify-center p-1 rounded-kt-card bg-kt-bg-overlay-300 hover:bg-kt-positive-weak hover:text-kt-positive-text text-kt-text-muted disabled:opacity-50 cursor-pointer border border-kt-border-panel"
                    >
                      {isUpdating ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
