export type MacroViewSourceType =
  | "video_manual_summary"
  | "external_llm_summary"
  | "manual_note";

export type MacroViewNote = {
  id: string;

  sourceType: MacroViewSourceType;

  sourceUrl: string | null;
  sourceTitle: string | null;
  authorName: string | null;

  thesisKo: string;

  keyVariables: {
    variable:
      | "interest_rate"
      | "yield_curve"
      | "usd_krw"
      | "dxy"
      | "credit_spread"
      | "vix"
      | "spx_trend"
      | "kospi_trend"
      | "liquidity"
      | "sentiment"
      | "other";

    view:
      | "positive_for_risk_assets"
      | "negative_for_risk_assets"
      | "neutral"
      | "unclear";

    evidenceText: string;
  }[];

  regimeImplication:
    | "risk_on"
    | "selective_risk_on"
    | "neutral"
    | "risk_off"
    | "panic"
    | "overheated"
    | "unclear";

  userReviewStatus:
    | "draft"
    | "reviewed"
    | "rejected";

  userMemo: string | null;

  createdAt: string;
  updatedAt: string;
};
