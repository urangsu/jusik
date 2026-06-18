import React, { useEffect, useState } from "react";
import { MacroViewNote } from "@/domain/macro/macro-view-note";
import { useI18n } from "@/i18n/use-i18n";
import { BookOpen, FileText, Check, AlertCircle, Plus } from "lucide-react";

export const MacroPlaybookPanel: React.FC = () => {
  const { locale } = useI18n();
  const isKo = locale === "ko";

  const [notes, setNotes] = useState<MacroViewNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [thesis, setThesis] = useState("");
  const [regime, setRegime] = useState<MacroViewNote["regimeImplication"]>("neutral");
  const [memo, setMemo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function fetchPlaybook() {
      try {
        const res = await fetch("/api/macro/playbook");
        if (res.ok) {
          const envelope = await res.json();
          if (active && envelope?.status === "cached") {
            setNotes(envelope.value.notes || []);
          }
        }
      } catch (err) {
        console.error("Failed to fetch macro playbook", err);
      } finally {
        if (active) setLoading(false);
      }
    }
    fetchPlaybook();
    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!thesis.trim()) return;

    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch("/api/macro/playbook/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceType: "manual_note",
          thesisKo: thesis,
          regimeImplication: regime,
          userReviewStatus: "draft",
          userMemo: memo || null,
        }),
      });

      const data = await res.json();
      if (res.ok && data?.status === "cached") {
        setNotes((prev) => [data.value, ...prev]);
        setThesis("");
        setMemo("");
        setRegime("neutral");
        setMessage(isKo ? "메모가 성공적으로 추가되었습니다 (상태: Draft)" : "Note added successfully as Draft.");
      } else {
        setMessage(data?.message || (isKo ? "오류가 발생했습니다 (LOCAL_SETTINGS_WRITE_ENABLED 확인 필요)." : "Error adding note (check LOCAL_SETTINGS_WRITE_ENABLED)."));
      }
    } catch (err: any) {
      setMessage(err.message || String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (noteId: string, status: "reviewed" | "rejected") => {
    try {
      const res = await fetch("/api/macro/playbook/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_status",
          noteId,
          status,
        }),
      });
      const data = await res.json();
      if (res.ok && data?.status === "cached") {
        setNotes((prev) => prev.map((n) => (n.id === noteId ? data.value : n)));
      } else {
        alert(data.message || "상태 변경 실패");
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="bg-kt-bg-surface-100 border border-kt-border-panel p-6 rounded-kt-card animate-pulse flex items-center justify-center">
        <span className="text-xs text-kt-text-muted">{isKo ? "로딩 중..." : "Loading..."}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-5 w-full">
      {/* Past notes list (Left / Scrollable) */}
      <div className="flex-1 bg-kt-bg-surface-100 border border-kt-border-panel rounded-kt-card p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2 border-b border-kt-border-panel pb-2">
          <BookOpen className="w-4 h-4 text-kt-text-secondary" />
          <span className="text-xs font-bold text-kt-text-primary">
            {isKo ? "거시경제 분석 의견록" : "Macro View Notes"}
          </span>
        </div>

        <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-1">
          {notes.length === 0 ? (
            <span className="text-xs text-kt-text-muted py-6 text-center">
              {isKo ? "등록된 거시 의견 메모가 없습니다." : "No macro notes registered."}
            </span>
          ) : (
            notes.map((n) => (
              <div
                key={n.id}
                className="bg-kt-bg-body/40 border border-kt-border-panel/60 p-3 rounded text-[11px] leading-relaxed flex flex-col gap-2"
              >
                <div className="flex items-center justify-between border-b border-kt-border-panel/30 pb-1.5">
                  <span className="text-kt-text-muted tabular-nums">
                    {new Date(n.createdAt).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`px-1.5 py-0.5 rounded-[3px] text-[9px] font-bold ${
                        n.userReviewStatus === "reviewed"
                          ? "text-kt-positive-text bg-kt-positive-weak"
                          : n.userReviewStatus === "rejected"
                          ? "text-kt-negative-text bg-kt-negative-weak"
                          : "text-kt-text-secondary bg-kt-bg-surface-200"
                      }`}
                    >
                      {n.userReviewStatus.toUpperCase()}
                    </span>
                    <span className="text-kt-text-muted">|</span>
                    <span className="text-kt-text-primary uppercase font-bold">{n.regimeImplication}</span>
                  </div>
                </div>

                <p className="text-kt-text-secondary whitespace-pre-wrap">{n.thesisKo}</p>

                {n.userMemo && (
                  <div className="bg-kt-bg-surface-200/50 p-2 rounded text-[10px] text-kt-text-muted">
                    <span className="font-semibold">{isKo ? "사용자 메모: " : "User Memo: "}</span>
                    {n.userMemo}
                  </div>
                )}

                {/* Status Switcher (Action panel) */}
                {n.userReviewStatus === "draft" && (
                  <div className="flex items-center gap-2 mt-1 justify-end border-t border-kt-border-panel/20 pt-1.5">
                    <button
                      onClick={() => handleStatusChange(n.id, "reviewed")}
                      className="px-2 py-0.5 bg-kt-positive-weak/30 hover:bg-kt-positive-weak text-kt-positive-text border border-kt-positive-weak/60 rounded-[3px] cursor-pointer text-[9px] flex items-center gap-1"
                    >
                      <Check className="w-3 h-3" />
                      {isKo ? "승인" : "Approve"}
                    </button>
                    <button
                      onClick={() => handleStatusChange(n.id, "rejected")}
                      className="px-2 py-0.5 bg-kt-negative-weak/30 hover:bg-kt-negative-weak text-kt-negative-text border border-kt-negative-weak/60 rounded-[3px] cursor-pointer text-[9px] flex items-center gap-1"
                    >
                      <AlertCircle className="w-3 h-3" />
                      {isKo ? "반려" : "Reject"}
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Input Note Form (Right) */}
      <form
        onSubmit={handleSubmit}
        className="w-full lg:w-[320px] bg-kt-bg-surface-100 border border-kt-border-panel rounded-kt-card p-4 flex flex-col gap-3.5"
      >
        <div className="flex items-center gap-2 border-b border-kt-border-panel pb-2">
          <FileText className="w-4 h-4 text-kt-text-secondary" />
          <span className="text-xs font-bold text-kt-text-primary">
            {isKo ? "신규 분석 메모 추가" : "Add Macro Note"}
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] text-kt-text-muted font-semibold">
            {isKo ? "핵심 분석 관점 (한글)" : "Core Thesis (Korean)"}
          </label>
          <textarea
            value={thesis}
            onChange={(e) => setThesis(e.target.value)}
            rows={3}
            placeholder={
              isKo ? "지수 125일 이평선 지지력 확인, 금리 동향 요약 등..." : "Enter macro thesis here..."
            }
            className="w-full p-2 text-xs bg-kt-bg-body border border-kt-border-panel focus:border-kt-text-secondary outline-none rounded-kt-card text-kt-text-primary resize-none placeholder-kt-text-muted/50"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3.5">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-kt-text-muted font-semibold">
              {isKo ? "예상 레짐 국면" : "Implicated Regime"}
            </label>
            <select
              value={regime}
              onChange={(e) => setRegime(e.target.value as any)}
              className="w-full p-2 text-xs bg-kt-bg-body border border-kt-border-panel outline-none rounded-kt-card text-kt-text-primary"
            >
              <option value="risk_on">RISK_ON</option>
              <option value="selective_risk_on">SELECTIVE_RISK_ON</option>
              <option value="neutral">NEUTRAL</option>
              <option value="risk_off">RISK_OFF</option>
              <option value="panic">PANIC</option>
              <option value="overheated">OVERHEATED</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-kt-text-muted font-semibold">
              {isKo ? "비고 / 메모" : "Memo / Note"}
            </label>
            <input
              type="text"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder={isKo ? "출처 등 입력" : "e.g., NH report"}
              className="w-full p-2 text-xs bg-kt-bg-body border border-kt-border-panel focus:border-kt-text-secondary outline-none rounded-kt-card text-kt-text-primary placeholder-kt-text-muted/50"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2 bg-kt-bg-surface-200 hover:bg-kt-bg-overlay-300 text-kt-text-primary border border-kt-border-panel font-semibold text-xs rounded-kt-card transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <Plus className="w-3.5 h-3.5" />
          {isKo ? "분석 메모 등록" : "Register Note"}
        </button>

        {message && (
          <span className="text-[10px] text-kt-text-secondary text-center leading-normal block">
            {message}
          </span>
        )}
      </form>
    </div>
  );
};
