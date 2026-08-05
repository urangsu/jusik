import type { DataEnvelope } from "@/domain/common/data-status";

export function checkResearchWriteGuard(): { allowed: boolean; status: number; message: string } {
  if (process.env.NODE_ENV === "production") {
    return {
      allowed: false,
      status: 403,
      message: "Forbidden: Research writes are not allowed in production.",
    };
  }

  if (process.env.LOCAL_RESEARCH_WRITES_ENABLED !== "true") {
    return {
      allowed: false,
      status: 405,
      message: "disabled",
    };
  }

  return {
    allowed: true,
    status: 200,
    message: "OK",
  };
}

export function makeResearchWriteErrorEnvelope(
  status: number,
  message: string
): DataEnvelope<null> {
  return {
    value: null,
    status: "error",
    source: "research_write_guard",
    sourceTier: "manual_import",
    warnings: [],
    updatedAt: null,
    message,
  } as DataEnvelope<null>;
}
