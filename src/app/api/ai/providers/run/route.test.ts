import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import type { AiPromptInput } from "@/domain/ai/ai-prompt-input";

const samplePromptInput: AiPromptInput = {
  id: "pi_route_test",
  intent: "audit_finding_explanation",
  systemPolicy: {
    language: "ko",
    forbiddenActions: [],
    requiredDisclaimers: ["본 내용은 감사 Finding의 진단 설명이며 투자 지시가 아닙니다."],
    outputFormat: "structured_json_only",
  },
  contextPack: {
    id: "finding_route_test",
    intent: "audit_finding_explanation",
    sourceRefs: [
      {
        sourceType: "audit_finding",
        sourceId: "finding_route_test",
        source: "audit_finding_store",
        status: "cached",
        updatedAt: "2026-06-25T00:00:00Z",
        warnings: [],
      },
    ],
    facts: [],
    limitations: [],
    createdAt: "2026-06-25T00:00:00Z",
  },
  userInstruction: null,
  allowedClaimSourceIds: ["finding_route_test"],
  requiredOutputSchema: "StructuredAiOutput",
  createdAt: "2026-06-25T00:00:00Z",
};

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/ai/providers/run", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/ai/providers/run", () => {
  it("mock provider returns 200 with validated output", async () => {
    const response = await POST(
      makeRequest({
        providerId: "mock",
        promptInput: samplePromptInput,
        requestHash: "hash_run_mock",
        locale: "ko",
      })
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.sourceTier).toBe("manual_import");
    expect(data.value).not.toBeNull();
    expect(data.value.providerResult.status).toBe("available");
    expect(data.value.validatedOutput).not.toBeNull();
    expect(data.value.blocked).toBe(false);
  });

  it("disabled_openai returns 200 with status=not_supported and output=null", async () => {
    const response = await POST(
      makeRequest({
        providerId: "disabled_openai",
        promptInput: samplePromptInput,
        requestHash: "hash_run_disabled_openai",
        locale: "ko",
      })
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.status).toBe("not_supported");
    expect(data.value.providerResult.status).toBe("not_supported");
    expect(data.value.providerResult.output).toBeNull();
    expect(data.value.validatedOutput).toBeNull();
  });

  it("invalid providerId returns 400", async () => {
    const response = await POST(
      makeRequest({
        providerId: "invalid_provider",
        promptInput: samplePromptInput,
        requestHash: "hash_run_invalid",
      })
    );

    expect(response.status).toBe(400);
  });

  it("missing requestHash returns 400", async () => {
    const response = await POST(
      makeRequest({
        providerId: "mock",
        promptInput: samplePromptInput,
      })
    );

    expect(response.status).toBe(400);
  });

  it("malformed body returns 500 (JSON parse error)", async () => {
    const req = new NextRequest("http://localhost/api/ai/providers/run", {
      method: "POST",
      body: "not json",
      headers: { "content-type": "application/json" },
    });

    const response = await POST(req);
    // JSON parse failure is an unhandled server error
    expect(response.status).toBe(500);
  });
});
