export type ResearchVoiceProfile = {
  voiceId: string;
  displayName: string;
  publicHandle: string;
  sourcePlatforms: string[];
  affiliationStatus: "official" | "independent_tracker";
  productionEligible: false;
};

export type ResearchPostSourceMethod = "official_api" | "user_json" | "user_csv";

export type PublicResearchPost = {
  postId: string;
  voiceId: string;
  sourceUrl: string;
  externalId: string;
  publishedAt: string;
  ingestedAt: string;
  contentHash: string;
  text: string;
  revisionOf: string | null;
  status: "active" | "revised" | "deleted";
  sourceMethod: ResearchPostSourceMethod;
  /** Custom metadata (e.g. mention count, engagement stats) */
  metadata?: Record<string, any>;
};
