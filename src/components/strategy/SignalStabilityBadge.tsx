import React from "react";
import { SignalStability } from "@/domain/signals/signal-stability";
import { StatusBadge } from "../ui/StatusBadge";

export const SignalStabilityBadge: React.FC<{ stability: SignalStability | null }> = ({ stability }) => {
  if (!stability) {
    return <StatusBadge status="insufficient_data" />;
  }

  const isStable =
    stability.consecutiveDays >= 3 &&
    stability.flipCount30d <= 4 &&
    stability.actionableThresholdMet;

  return <StatusBadge status={isStable ? "cached" : "insufficient_data"} />;
};
