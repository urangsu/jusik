# Structured Output Guard & AI Explanation Safety Layer

This document details the architecture and operational rules of the **Structured Output Guard** and **AI Explanation Safety Layer**.

## Core Principles

1. **No Real LLM Calls**:
   - The Structured Output Guard is **not** an LLM or AI generation service. It does not perform any calls to external APIs (OpenAI, Anthropic, Gemini, etc.).
   
2. **Deterministic Validation Layer**:
   - The Guard acts as a pure, deterministic validation layer that intercepts and reviews structured outputs claiming to represent AI explanations.
   
3. **Forbidden Wording Guard**:
   - Matches a strict blocklist of forbidden marketing/recommendation words (e.g., `매수`, `매도`, `추천`, `수익 보장`, `strong buy`).
   - Clean matching exception phrases (e.g., `"not a buy or sell recommendation"`, `"매수/매도 추천을 하지 않습니다"`) before blocklist matching to ensure zero false positives.
   
4. **Data Grounding (Grounded Claims)**:
   - Every single claim in the structured output MUST be fully grounded.
   - Claims must have `sourceId`, `source`, `status`, `updatedAt` (or null with limitation), and a `warnings` array.
   - If status is `error`, `not_found`, or `api_required`, the claim's `riskLevel` must be `high` or `blocked`.
   
5. **Mandatory Intent Disclaimers**:
   - Each intent has a specific required legal notice/disclaimer. If missing, the output is blocked.

## Output Block Handling in UI
- If `isBlocked` is evaluated to `true`, the UI **must not** display the generated explanation contents (`summary` or `claims`).
- Instead, it must show a clear safety warning banner alongside the parsed `blockReasons`.
