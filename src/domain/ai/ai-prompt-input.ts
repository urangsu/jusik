import type { AiOutputIntent, AiContextPack } from "./structured-ai-output";

export type AiPromptInput = {
  id: string;
  intent: AiOutputIntent;

  systemPolicy: {
    language: "ko" | "en";
    forbiddenActions: string[];
    requiredDisclaimers: string[];
    outputFormat: "structured_json_only";
  };

  contextPack: AiContextPack;

  userInstruction: string | null;

  allowedClaimSourceIds: string[];
  requiredOutputSchema: "StructuredAiOutput";

  createdAt: string;
};
