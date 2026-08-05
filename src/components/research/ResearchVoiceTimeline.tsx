import React from "react";
import { ExternalLink, Radio, MessageSquare, AlertCircle } from "lucide-react";
import { Panel } from "../ui/Panel";
import type { PublicResearchPost } from "@/domain/research/research-voice";

interface ResearchVoiceTimelineProps {
  timeline: PublicResearchPost[];
}

export const ResearchVoiceTimeline: React.FC<ResearchVoiceTimelineProps> = ({ timeline }) => {
  if (timeline.length === 0) {
    return (
      <Panel title="리서치 타임라인 (Research Voices Timeline)" headerAction={<Radio className="w-4 h-4 text-kt-text-muted" />}>
        <div className="bg-kt-bg-overlay-100 p-4 rounded-kt-card border border-kt-border-panel/30 text-center text-kt-text-muted text-xs">
          등록된 리서치 의견이 없습니다.
        </div>
      </Panel>
    );
  }

  return (
    <Panel title="리서치 타임라인 (Research Voices Timeline)" headerAction={<Radio className="w-4 h-4 text-kt-text-muted" />}>
      <div className="flex flex-col gap-4 text-xs">
        <div className="text-[11px] text-kt-text-muted">
          추적 등록된 주요 독립 분석가 및 채널의 수집된 공개 리서치 기록 히스토리입니다.
        </div>

        <div className="flex flex-col gap-3">
          {timeline.map((post) => {
            const sourceLabels: Record<string, string> = {
              official_api: "공식 API",
              user_json: "사용자 JSON",
              user_csv: "사용자 CSV",
            };
            const badgeLabel = sourceLabels[post.sourceMethod] || post.sourceMethod;
            const dateStr = new Date(post.publishedAt).toLocaleDateString();

            return (
              <div
                key={post.postId}
                className="bg-kt-bg-surface-200/50 border border-kt-border-panel/40 rounded-kt-card p-4 flex flex-col gap-3"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-kt-border-panel/20 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-kt-text-primary">{post.voiceId}</span>
                    <span className="text-[10px] text-kt-text-muted tabular-nums">{dateStr}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {badgeLabel && (
                      <span className="text-[9px] font-bold text-kt-text-secondary bg-kt-bg-overlay-200 px-1.5 py-0.5 rounded border border-kt-border-panel/30">
                        {badgeLabel}
                      </span>
                    )}
                    <a
                      href={post.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[10px] text-kt-text-muted hover:text-kt-text-primary transition-colors cursor-pointer"
                    >
                      <span>원문 링크</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                {/* Content */}
                <p className="text-kt-text-secondary leading-relaxed bg-kt-bg-overlay-100 p-3 rounded-kt-card border border-kt-border-panel/20 text-xs">
                  {post.text}
                </p>

                {/* Non-affiliation / Disclaimer */}
                <div className="flex items-start gap-2 text-[10px] text-kt-text-muted leading-relaxed">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>
                    독립 분석가 제공 자료 - 본 의견은 제휴 또는 관련 회사 및 기관의 공식 입장이 아니며, 투자 판단에 대한 어떠한 책임도 지지 않습니다.
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Panel>
  );
};
