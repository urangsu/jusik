# Mock AI Output Adapter & Guarded Rendering Policy

This document explains the purpose, policies, and behavior of the **Mock AI Output Adapter** and **Guarded Rendering** interface.

## 1. Core Principles & Policies

1.  **No Real AI/LLM API Calls**:
    *   The Mock AI Output Adapter is **not** connected to any external AI services (OpenAI, Gemini, Anthropic, etc.).
    *   All AI generation functions remain entirely frozen or disabled.

2.  **Deterministic Test Adapter**:
    *   The adapter is a pure, deterministic logic block that generates sample structured outputs (`StructuredAiOutput`) based on a configured `mode` parameter: `"safe" | "forbidden_wording" | "ungrounded_claim" | "missing_disclaimer"`.
    *   This is designed solely to verify the robustness of the **Structured Output Guard** validation pipeline and client-side safe rendering.

3.  **Guarded Rendering (Block Policy)**:
    *   If the output is marked as blocked (`isBlocked = true`) by the Structured Output Validator:
        *   The UI **must never** render the explanation content fields (`summary`, `claims`).
        *   Instead, a clear safety block warning banner, the exact list of `blockReasons`, and detected `blockedTerms` must be shown to the user.
    *   If the output is safe (`isBlocked = false`):
        *   The UI displays the full structure, including titles, summaries, grounded claims, limitations, and required disclaimers.

4.  **No Investment Recommendations**:
    *   Even when an explanation successfully passes the validation pipeline (Safe Mode), it is presented for diagnostic and review purposes only.
    *   It contains clear, prominent disclaimers and warnings stating that it is **not** an investment instruction or stock recommendation.

## 2. Modes and Validation Outcomes

*   **`safe`**:
    *   Generates fully grounded claims mapped to valid `allowedClaimSourceIds`.
    *   Includes required legal notices and disclaimers.
    *   Outcome: **Validation Passes** (Cached/Safe).
*   **`forbidden_wording`**:
    *   Inserts blacklisted advisory phrases like `"매수"` or `"수익 보장"`.
    *   Outcome: **Validation Blocked** (Blocked Term Detected).
*   **`ungrounded_claim`**:
    *   Simulates claims referencing empty or missing source IDs.
    *   Outcome: **Validation Blocked** (Missing Claim Source).
*   **`missing_disclaimer`**:
    *   Excludes the mandatory disclaimer block specified for the intent.
    *   Outcome: **Validation Blocked** (Missing Mandatory Disclaimer).

## 3. Replay Regression Integration
*   The regression runner (`ai-explanation-replay-runner`) triggers the Mock AI Output Adapter for each mode to compare expected and actual block states, recording findings in the Replay Ledger to prevent safety regressions.

