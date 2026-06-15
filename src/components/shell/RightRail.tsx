import React from "react";
import { Panel } from "../ui/Panel";
import { Asset } from "@/domain/market/asset";
import { Shield, Sparkles, FileText, Lock } from "lucide-react";
import { MetricCell } from "../ui/MetricCell";

interface RightRailProps {
  selectedAsset: Asset | null;
}

export const RightRail: React.FC<RightRailProps> = ({ selectedAsset }) => {
  return (
    <aside className="w-80 border-l border-kt-border-panel flex flex-col gap-4 p-4 overflow-y-auto bg-kt-bg-body">
      {/* AI Insight */}
      <Panel
        title="AI 인사이트 (AI Insight)"
        headerAction={<Sparkles className="w-4 h-4 text-purple-400" />}
      >
        <div className="flex flex-col gap-3 text-xs leading-relaxed text-kt-text-secondary">
          <div className="bg-kt-bg-overlay-300 p-3 rounded-kt-card border border-kt-border-panel">
            <span className="font-semibold block mb-1 text-kt-text-primary">분석 규칙</span>
            <p className="text-kt-text-muted leading-relaxed">
              AI는 투자 보조 설명자로서 작동하며 실거래 주문 생성이나 임의의 금융 수치를 생성하지 않습니다.
            </p>
          </div>
          <MetricCell value={null} status="api_required" />
        </div>
      </Panel>

      {/* Filing Watch */}
      <Panel
        title="공시 모니터링 (Filing Watch)"
        headerAction={<FileText className="w-4 h-4 text-blue-400" />}
      >
        <div className="flex flex-col gap-3 justify-center items-center py-6 text-center">
          <span className="text-xs text-kt-text-muted">
            {selectedAsset
              ? `${selectedAsset.nameKo || selectedAsset.symbol} 최신 공시 대기`
              : "공시 조회 대기 상태"}
          </span>
          <MetricCell value={null} status="api_required" />
        </div>
      </Panel>

      {/* Order Panel (Disabled) */}
      <Panel title="일반 주문 (Order Panel)" headerAction={<Shield className="w-4 h-4 text-red-400" />}>
        <div className="relative border border-dashed border-kt-border-panel rounded-kt-card p-4 flex flex-col gap-3 bg-kt-bg-overlay-300/40">
          <div className="absolute inset-0 bg-kt-bg-body/80 backdrop-blur-[0.5px] flex flex-col items-center justify-center p-4 text-center z-10 rounded-kt-card">
            <Lock className="w-5 h-5 text-kt-text-muted mb-2" />
            <span className="text-xs font-semibold text-kt-text-primary block mb-1">실거래 기능 비활성화</span>
            <span className="text-[10px] text-kt-text-muted leading-normal">
              이 버전에서는 주문/매매 송신 기능을 지원하지 않습니다.
            </span>
          </div>

          <div className="flex flex-col gap-2 opacity-25 select-none">
            <div className="flex justify-between text-xs">
              <span>구분</span>
              <span className="font-semibold">지정가</span>
            </div>
            <div className="flex items-center justify-between gap-2 border-b border-kt-border-panel py-1">
              <span className="text-xs">수량</span>
              <span className="text-sm font-semibold">0</span>
            </div>
            <div className="flex items-center justify-between gap-2 border-b border-kt-border-panel py-1">
              <span className="text-xs">단가</span>
              <span className="text-sm font-semibold">0</span>
            </div>
            <button className="w-full py-2 bg-kt-positive text-white font-bold rounded-kt-card text-xs mt-2" disabled>
              매수하기
            </button>
          </div>
        </div>
      </Panel>
    </aside>
  );
};
