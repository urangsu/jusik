import { SignalLabel } from "./signal-label";
import { SignalHorizon } from "../factors/factor-horizon";
import { ViewApplicability } from "./view-applicability";

export type HorizonSegmentedAgreement = {
  assetId: string;
  date: string;

  byHorizon: Record<SignalHorizon, {
    label: SignalLabel;
    weightedScore: number | null;
    participatingViews: string[];
  }>;

  crossHorizonTension: {
    detected: boolean;
    description: string | null;
  };
};

type ViewInput = {
  viewId: string;
  horizon: SignalHorizon;
  label: SignalLabel;
  score: number | null;
};

function labelFromScore(score: number): SignalLabel {
  if (score >= 80) return "strong_watch";
  if (score >= 65) return "watch";
  if (score >= 45) return "neutral";
  if (score >= 30) return "caution";
  return "risk";
}

function isBullish(label: SignalLabel): boolean {
  return label === "strong_watch" || label === "watch";
}

function isBearish(label: SignalLabel): boolean {
  return label === "risk" || label === "caution";
}

/**
 * Calculates agreement segments for each horizon and detects cross-horizon tension.
 * 
 * Rules:
 * 1. Views where applicability is false are excluded from participating.
 * 2. Cross-horizon tension is detected if short-term and long-term signals are in opposing directions.
 */
export function calculateHorizonSegmentedAgreement(
  assetId: string,
  date: string,
  views: ViewInput[],
  applicability: ViewApplicability[]
): HorizonSegmentedAgreement {
  const appMap = new Map(applicability.map((a) => [a.viewId, a.applicable]));

  // Filter out non-applicable views
  const applicableViews = views.filter((v) => {
    const isApp = appMap.get(v.viewId);
    return isApp !== false; // defaults to true if not specified
  });

  const horizons: SignalHorizon[] = ["short", "medium", "long"];
  const byHorizon = {} as Record<SignalHorizon, {
    label: SignalLabel;
    weightedScore: number | null;
    participatingViews: string[];
  }>;

  for (const h of horizons) {
    const hViews = applicableViews.filter((v) => v.horizon === h);
    if (hViews.length === 0) {
      byHorizon[h] = {
        label: "insufficient_data",
        weightedScore: null,
        participatingViews: [],
      };
      continue;
    }

    const finiteScores = hViews.filter((v) => v.score !== null).map((v) => v.score as number);
    const avgScore = finiteScores.length > 0
      ? Math.round(finiteScores.reduce((a, b) => a + b, 0) / finiteScores.length)
      : null;

    let finalLabel: SignalLabel = "neutral";
    if (avgScore !== null) {
      finalLabel = labelFromScore(avgScore);
    } else {
      // Fallback if score is null but labels exist
      const watchCount = hViews.filter((v) => isBullish(v.label)).length;
      const riskCount = hViews.filter((v) => isBearish(v.label)).length;
      if (watchCount > riskCount) finalLabel = "watch";
      else if (riskCount > watchCount) finalLabel = "caution";
    }

    byHorizon[h] = {
      label: finalLabel,
      weightedScore: avgScore,
      participatingViews: hViews.map((v) => v.viewId),
    };
  }

  // Detect cross-horizon tension between short and long
  const shortLabel = byHorizon["short"].label;
  const longLabel = byHorizon["long"].label;
  let tensionDetected = false;
  let tensionDescription: string | null = null;

  if (shortLabel !== "insufficient_data" && longLabel !== "insufficient_data") {
    const shortBullish = isBullish(shortLabel);
    const shortBearish = isBearish(shortLabel);
    const longBullish = isBullish(longLabel);
    const longBearish = isBearish(longLabel);

    if ((shortBullish && longBearish) || (shortBearish && longBullish)) {
      tensionDetected = true;
      tensionDescription = `Cross-horizon tension detected: Short-term is ${shortLabel} while Long-term is ${longLabel}.`;
    }
  }

  return {
    assetId,
    date,
    byHorizon,
    crossHorizonTension: {
      detected: tensionDetected,
      description: tensionDescription,
    },
  };
}
