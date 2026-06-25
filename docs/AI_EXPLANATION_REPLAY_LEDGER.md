# AI Explanation Replay Ledger & Golden Safety Regression Suite

This document details the policies, architecture, and regression checks of the **AI Explanation Replay Ledger** and **Golden Safety Regression Suite**.

## 1. Core Principles

1.  **No Real AI/LLM API Calls**:
    *   The regression replay ledger operates entirely on mock structured AI output responses.
    *   It does **not** call any real external AI APIs (OpenAI, Anthropic, Gemini, etc.).

2.  **Goldens Safety Regression Check**:
    *   A set of E2E verification test cases (Golden Cases) is defined in the system.
    *   Each test mode maps to an expected outcome (e.g. `safe` is expected not to block, whereas `forbidden_wording`, `ungrounded_claim`, and `missing_disclaimer` are expected to block).
    *   If a guard rule modification causes a safe output to block, or allows a blocked output to pass, the suite flags a failure.

3.  **UI Safety (Blocked Output Content Hidden)**:
    *   For validation safety under replay tests, blocked output records (`actualBlocked: true`) **must never** expose their content (summaries or claims) on the UI.
    *   The UI panel displays E2E pass/fail indicators and lists the exact `failureReasons` where validation diverges from expectations.

4.  **Audit Ledger Isolation**:
    *   Replay records are saved separately under `data/ai/explanation-replay-ledger/`.
    *   They are kept completely distinct from the main Cache Store directory to avoid polluting actual user request records.

## 2. Replay Verification Modes

*   **`safe`**: Evaluated as `expectedBlocked = false`. If the validator accepts, E2E checks pass.
*   **`forbidden_wording`**: Evaluated as `expectedBlocked = true`. Checks if recommendation terms trigger block status.
*   **`ungrounded_claim`**: Evaluated as `expectedBlocked = true`. Checks if source missing claims trigger block status.
*   **`missing_disclaimer`**: Evaluated as `expectedBlocked = true`. Checks if required disclaimers missing triggers block status.
