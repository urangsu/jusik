import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import type { AiPromptInput } from "@/domain/ai/ai-prompt-input";

vi.mock("@/server/ai/ai-provider-dry-run-service", () => ({
  runAiProviderDryRun: vi.fn(),
}));

import { runAiProviderDryRun } from "@/server/ai/ai-provider-dry-run-service";

function promptInput(): AiPromptInput {
  return {
    id: "prompt_test",
    intent: "provider_status_explanation",
    systemPolicy: {
      language: "ko",
      forbiddenActions: ["buy", "sell"],
      requiredDisclaimers: ["diagnostic only"],
      outputFormat: "structured_json_only",
    },
    contextPack: {
      id: "ctx_test",
      intent: "provider_status_explanation",
      sourceRefs: [
        {
          sourceType: "data_envelope",
          sourceId: "env_test",
          source: "test",
          status: "cached",
          updatedAt: "2026-07-02T00:00:00.000Z",
          warnings: [],
        },
      ],
      facts: [],
      limitations: [],
      createdAt: "2026-07-02T00:00:00.000Z",
    },
    userInstruction: null,
    allowedClaimSourceIds: ["env_test"],
    requiredOutputSchema: "StructuredAiOutput",
    createdAt: "2026-07-02T00:00:00.000Z",
  };
}

describe("POST /api/ai/providers/dry-run", () => {
  it("returns cached envelope for allowed mock dry-run without external calls", async () => {
    vi.mocked(runAiProviderDryRun).mockReturnValue({
      providerId: "mock",
      allowed: true,
      blockedByPolicy: false,
      wouldCallExternalProvider: false,
      tokenEstimate: 100,
      sourceRefCount: 1,
      missingSourceRefs: false,
      warnings: [],
      message: null,
      checkedAt: "2026-07-02T00:00:00.000Z",
    });

    const response = await POST(
      new NextRequest("http://localhost/api/ai/providers/dry-run", {
        method: "POST",
        body: JSON.stringify({ providerId: "mock", promptInput: promptInput() }),
        headers: { "content-type": "application/json" },
      }),
    );
    const data = await response.json();

    expect(data.status).toBe("cached");
    expect(data.value.wouldCallExternalProvider).toBe(false);
  });

  it("returns not_supported envelope when provider is blocked", async () => {
    vi.mocked(runAiProviderDryRun).mockReturnValue({
      providerId: "disabled_openai",
      allowed: false,
      blockedByPolicy: true,
      wouldCallExternalProvider: false,
      tokenEstimate: 100,
      sourceRefCount: 1,
      missingSourceRefs: false,
      warnings: ["disabled provider"],
      message: "Provider disabled.",
      checkedAt: "2026-07-02T00:00:00.000Z",
    });

    const response = await POST(
      new NextRequest("http://localhost/api/ai/providers/dry-run", {
        method: "POST",
        body: JSON.stringify({ providerId: "disabled_openai", promptInput: promptInput() }),
        headers: { "content-type": "application/json" },
      }),
    );
    const data = await response.json();

    expect(data.status).toBe("not_supported");
    expect(data.value.blockedByPolicy).toBe(true);
  });

  it("rejects malformed dry-run requests", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/ai/providers/dry-run", {
        method: "POST",
        body: JSON.stringify({ providerId: "mock" }),
        headers: { "content-type": "application/json" },
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.status).toBe("error");
    expect(data.value).toBeNull();
  });
});
