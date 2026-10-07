# Direction Gate v0

Experimental branch-only prototype.

## Purpose

Do not continuously monitor or control AI movement. Detect lightweight change candidates first, then call an OpenAI model only when a check is worth paying for.

## Parts

- `observer.js`: deterministic first-stage observer. No LLM.
- `../api/direction-check.js`: optional server-side OpenAI Responses API gate.
- `index.html`: manual event harness for observing trigger behavior.

## States returned by API

- `CONNECTED`
- `OPEN_UNKNOWN`
- `CONTINUING_ELSEWHERE`

The API does not infer a replacement goal.

## Security boundary

Never put `OPENAI_API_KEY` in browser JavaScript or GitHub Pages.

The current public Flow World is static GitHub Pages. To run the second-stage API check, deploy this branch through a server-capable host (for example Vercel) and set:

- `OPENAI_API_KEY`
- optional `OPENAI_DIRECTION_MODEL` (default: `gpt-6-luna`)

Without a server endpoint, the first-stage Observer still runs and reports `CHECK_WORTHY_CHANGE`.

## Current evidence boundary

This prototype proves only that:
1. a deterministic observer can avoid calling an LLM on every event;
2. a trigger can produce a compact Direction Gate payload;
3. the API boundary can be separated from the static client.

It does not yet prove that real ChatGPT conversation/tool events can be captured automatically. The event adapter is the next unresolved connection.

## Preview trigger

This branch is intentionally isolated from `main`. A tiny documentation-only change here is used to trigger a Vercel Preview deployment after the project and secret are configured.
