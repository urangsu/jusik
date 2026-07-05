import React from "react";
import { SignalStability } from "@/domain/signals/signal-stability";
import { StatusBadge } from "../ui/StatusBadge";

export const SignalStabilityBadge: React.FC<{ stability: SignalStability | null }> = ({ stability }) => {
  if (!stability) {
    return <StatusBadge status="insufficient_data" />;
  }

  if (stability.status === "passed") {
    return <StatusBadge status="cached" />;
  }
  if (stability.status === "blocked") {
    return <StatusBadge status="error" />;
  }
  return <StatusBadge status="insufficient_data" />;
};
