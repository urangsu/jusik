import { listAuditFindings } from "../audit/audit-finding-store";
import { buildAuditFindingContextPack } from "./ai-context-pack-builder";
import { buildAiPromptInputFromContextPack } from "./ai-prompt-input-builder";
import { createAiExplanationRequestHash } from "./ai-explanation-request-hash";
import { getAiExplanationCacheByHash } from "./ai-explanation-cache-store";
import { AiExplanationRequest, AiExplanationCacheRecord } from "@/domain/ai/ai-explanation-request";
import { AiPromptInput } from "@/domain/ai/ai-prompt-input";

export async function createAuditFindingExplanationRequest(input: {
  findingId: string;
  locale?: "ko" | "en";
  userPrompt?: string | null;
}): Promise<{
  request: AiExplanationRequest;
  promptInput: AiPromptInput;
  cached: AiExplanationCacheRecord | null;
}> {
  // 1. Load finding
  const findings = await listAuditFindings();
  const finding = findings.find((f) => f.id === input.findingId);
  if (!finding) {
    throw new Error(`Audit finding '${input.findingId}' not found.`);
  }

  // 2. Build context pack
  const contextPack = buildAuditFindingContextPack(finding);

  // 3. Build prompt input contract
  const promptInput = buildAiPromptInputFromContextPack({
    contextPack,
    intent: "audit_finding_explanation",
    locale: input.locale || "ko",
    userInstruction: input.userPrompt,
  });

  // 4. Create request hash
  const requestHash = createAiExplanationRequestHash({
    intent: "audit_finding_explanation",
    sourceType: "audit_finding",
    sourceId: finding.id,
    contextPackId: contextPack.id,
    sourceRefs: contextPack.sourceRefs,
    locale: input.locale || "ko",
    userPrompt: input.userPrompt || null,
  });

  // 5. Check cache
  const cached = await getAiExplanationCacheByHash(requestHash);

  // 6. Build request object
  const now = new Date().toISOString();
  const request: AiExplanationRequest = {
    id: `req_${finding.id}_${Date.now()}`,
    requestHash,
    intent: "audit_finding_explanation",
    sourceType: "audit_finding",
    sourceId: finding.id,
    contextPackId: contextPack.id,
    contextPack,
    locale: input.locale || "ko",
    userPrompt: input.userPrompt || null,
    status: cached ? "cached" : "pending",
    createdAt: now,
    updatedAt: now,
  };

  return {
    request,
    promptInput,
    cached,
  };
}
