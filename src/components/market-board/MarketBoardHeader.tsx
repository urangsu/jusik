import React from "react";
import { MacroRegimePanel } from "../macro/MacroRegimePanel";
import { SentimentReferencePanel } from "../sentiment/SentimentReferencePanel";
import { MacroPlaybookPanel } from "../macro/MacroPlaybookPanel";

export const MarketBoardHeader: React.FC = () => {
  return (
    <div className="flex flex-col gap-5 w-full">
      {/* 1. Macro Regime Snapshots */}
      <MacroRegimePanel />

      {/* 2. Sentiment Reference Cards (CNN & Crypto) */}
      <SentimentReferencePanel />

      {/* 3. Macro Playbook Note Taking Panel */}
      <MacroPlaybookPanel />
    </div>
  );
};
