# AI Provider Dry-run

AI provider dry-run validates whether an AI request would be allowed without calling an external LLM.

## Rules

- `wouldCallExternalProvider` is always `false`.
- Disabled providers remain blocked.
- Mock provider dry-run is allowed only with evidence `sourceRefs`.
- Prompt inputs without source references are blocked.
- Dry-run output is not an AI explanation and must not be rendered as investment opinion.

## API

- `POST /api/ai/providers/dry-run`

## Non-goals

- No OpenAI, Anthropic, Gemini, or local model call.
- No natural-language investment conclusion.
- No score generation.
