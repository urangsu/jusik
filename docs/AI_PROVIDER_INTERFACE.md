# AI Provider Interface Contract

This document describes the AI Provider Interface, the provider registry, and operational policies for the `jusik` system.

## 1. Purpose

This AI Provider Interface establishes a **contract layer** for future AI provider integrations. It does **not** implement any real external AI API calls. Its purpose is to:

1. Define a typed interface all providers must implement.
2. Pre-register all known providers in a **disabled-by-default** state.
3. Ensure any non-null provider output is validated by the **Structured Output Guard** before use.
4. Provide a deterministic **Mock Provider** for testing and development.

---

## 2. Provider Registry

| Provider ID | Kind | Status | API Key Required |
|---|---|---|---|
| `mock` | `mock` | **available** | No |
| `disabled_openai` | `external_disabled` | disabled | Yes |
| `disabled_anthropic` | `external_disabled` | disabled | Yes |
| `disabled_gemini` | `external_disabled` | disabled | Yes |
| `disabled_local` | `local_disabled` | disabled | No |

Only `mock` is enabled. All other providers return `status="not_supported"` and `output=null`.

---

## 3. Interface Contract

```ts
interface AiProvider {
  descriptor: AiProviderDescriptor;
  generateStructuredOutput(request: AiProviderRequest): Promise<AiProviderResult>;
}
```

Rules:
- Providers may only return `StructuredAiOutput | null` — no plain text or markdown.
- `supportsStreaming` is always `false`.
- Disabled providers always return `output=null`, `errorCode="AI_PROVIDER_DISABLED"`.

---

## 4. Guarded Provider Pipeline

```
getAiProvider(providerId)
  → provider.generateStructuredOutput(request)
  → [if output !== null] validateStructuredAiOutput(output)
  → { providerResult, validatedOutput, blocked, blockReasons }
```

- Disabled providers short-circuit after step 1 (no guard needed for null).
- The Structured Output Guard cannot be bypassed by any provider.

---

## 5. What This Is Not

- This is **not** a real LLM integration.
- No OpenAI, Anthropic, or Gemini SDK is installed.
- No external `fetch` calls to AI APIs are made.
- No API keys are used or read.
- No streaming is implemented.
