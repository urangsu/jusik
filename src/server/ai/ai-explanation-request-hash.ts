import crypto from "crypto";

export function createAiExplanationRequestHash(input: {
  intent: string;
  sourceType: string;
  sourceId: string;
  contextPackId: string;
  sourceRefs: {
    sourceType: string;
    sourceId: string;
    status: string;
    updatedAt: string | null;
    warnings: string[];
  }[];
  locale: "ko" | "en";
  userPrompt: string | null;
}): string {
  // 1. Sort warnings and fields in sourceRefs
  const refsCopy = input.sourceRefs.map((ref) => ({
    sourceType: ref.sourceType,
    sourceId: ref.sourceId,
    status: ref.status,
    updatedAt: ref.updatedAt,
    warnings: [...ref.warnings].sort(),
  }));

  // 2. Sort sourceRefs array by sourceType -> sourceId -> status -> updatedAt
  refsCopy.sort((a, b) => {
    if (a.sourceType !== b.sourceType) {
      return a.sourceType.localeCompare(b.sourceType);
    }
    if (a.sourceId !== b.sourceId) {
      return a.sourceId.localeCompare(b.sourceId);
    }
    if (a.status !== b.status) {
      return a.status.localeCompare(b.status);
    }
    const timeA = a.updatedAt || "";
    const timeB = b.updatedAt || "";
    return timeA.localeCompare(timeB);
  });

  // 3. Stabilize key orders recursively
  const stableInput = stabilizeObject({
    intent: input.intent,
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    contextPackId: input.contextPackId,
    sourceRefs: refsCopy,
    locale: input.locale,
    userPrompt: input.userPrompt,
  });

  // 4. Generate SHA-256 hash
  const serialized = JSON.stringify(stableInput);
  return crypto.createHash("sha256").update(serialized).digest("hex");
}

function stabilizeObject(obj: any): any {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(stabilizeObject);
  }
  const keys = Object.keys(obj).sort();
  const stable: any = {};
  for (const key of keys) {
    stable[key] = stabilizeObject(obj[key]);
  }
  return stable;
}
