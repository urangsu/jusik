export type SourceUsagePolicy =
  | "official"
  | "free_limited"
  | "licensed_free"
  | "personal_fallback"
  | "manual_import";

export type SourceWarning =
  | "none"
  | "unofficial"
  | "personal_use_only"
  | "license_review_required"
  | "commercial_use_not_allowed"
  | "manual_import_required";
