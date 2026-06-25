# AI Explanation Request Cache & Prompt Input Contract

This document outlines the architecture, rules, and cache mechanism for handling AI explanation requests.

## 1. Request Contract & Normalization

To ensure that AI explanation requests are deterministic and cache-friendly, all requests are mapped to a strict contract:

*   **Request Contract (`AiExplanationRequest`)**:
    *   Defines the source of the audit finding (`sourceType`, `sourceId`), the required `intent` (e.g., `audit_finding_explanation`), and details of the finding (such as `sourceRefs`, `warnings`, `riskLevel`).
*   **Prompt Input Contract (`AiPromptInput`)**:
    *   Constructs system policies, allowed claims, and formatting rules based on the request.
    *   Defines forbidden actions (e.g., no buy/sell recommendations, no target prices, no emojis).
    *   Specifies required legal notices and disclaimers per intent.

## 2. Request Hash Utility

To prevent duplicate LLM calls and enable caching, the cache layer identifies unique requests using a request hash:

*   **Parameters**: The hash is computed using properties of `AiExplanationRequest` (specifically, `sourceType`, `sourceId`, sorted `sourceRefs`, and sorted `warnings`).
*   **Sorting**:
    *   Array references (`sourceRefs`) are sorted by `sourceId` and `type` before hashing.
    *   Warning object arrays are sorted by key or code to ensure that identical warnings in a different order produce the same hash.

## 3. Cache & Block Separation

To maintain data integrity and prevent poisoned cache records, the store isolates safe cached responses from blocked ones:

*   **Normal Cache**:
    *   Valid AI explanations (i.e. those that pass the Structured Output Guard validation) are cached under the normal cache directory: `data/ai/explanation-cache/normal/`.
*   **Blocked Log**:
    *   Responses that fail safety or wording validation (`isBlocked: true`) are **never** stored in the normal cache.
    *   Instead, they are saved as blocked records under: `data/ai/explanation-cache/blocked/`.
    *   This ensures that future requests do not hit cached unsafe output.

## 4. UI Integration

*   **"설명 요청 준비" Button**:
    *   Rendered on the findings panel (`AuditFindingsPanel.tsx`) to allow previewing the constructed prompt contract before any processing.
    *   Displays the cache hit status and the strict system policies/allowed claims/disclaimers bound to the intent.

## 5. Mock Output Integration

To verify the E2E validation pipeline and safety rules without invoking external LLM APIs, a **Mock AI Output Adapter** is integrated:
*   **Verification Modes**: Runs the guard pipeline with different mock modes (`safe`, `forbidden_wording`, `ungrounded_claim`, `missing_disclaimer`).
*   **Storage Behavior**: 
    *   Mock runs in `safe` mode successfully pass validation and write a normal `AiExplanationCacheRecord` to `data/ai/explanation-cache/normal/`.
    *   Deviated modes fail validation, resulting in `isBlocked = true`, and save an `AiExplanationBlockedRecord` to `data/ai/explanation-cache/blocked/`.

