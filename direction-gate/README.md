# Boundary Control v1

Experimental branch-only prototype.

## Parent principle

Generation is free. Control only the boundary where generated material would become reality, an authoritative record, a permissioned action, or persistent state.

The system does **not** continuously grade model output.

## Minimal architecture

```text
Generation / exploration
        |
        v
Light Observer
  - records change candidates only
  - no model call
        |
        v
Boundary event?
  NONE  -> continue freely
  COMMIT / ACTION
        |
        +-- pending direction change? --> Connection Gate (Luna)
        |
        +-- Commit policy / Action policy
        |
        v
ALLOW / HOLD / UNKNOWN / ESCALATE
        |
        v
execute outside this prototype
        |
        v
re-observe
VERIFIED / CONFLICT / UNKNOWN
```

## Parts

- `observer.js`: deterministic movement observer. It stores pending change reasons but no longer calls the model merely because movement changed.
- `boundary-policy.js`: deterministic boundary policy for COMMIT and ACTION. It uses only explicit fields; it does not infer hidden intent.
- `../api/direction-check.js`: server-side Connection Gate using OpenAI Responses API. It asks only whether current movement is still connected to the human-placed direction.
- `index.html`: manual harness for the boundary flow.

## Connection Gate

The Connection Gate is invoked only when:

1. the Observer has pending change evidence, and
2. a COMMIT or ACTION boundary is reached.

States:

- `CONNECTED`
- `OPEN_UNKNOWN`
- `CONTINUING_ELSEWHERE`

It does not authorize the commit/action and does not infer a replacement goal.

## Commit Gate

The current deterministic prototype accepts explicit:

- epistemic state: OBSERVED / INFERRED / UNKNOWN / CONFLICT
- provenance present?
- authority confirmed?
- freshness confirmed?

Results:

- `ALLOW`
- `HOLD`
- `UNKNOWN`

UNKNOWN is a normal state, not a failure.

This gate does not decide semantic truth. It only refuses to silently promote a candidate when the declared evidence boundary is incomplete or conflicting.

## Action Gate

The current deterministic prototype accepts explicit:

- permission
- target
- scope
- impact
- reversibility

Results:

- `ALLOW`
- `HOLD`
- `UNKNOWN`
- `ESCALATE`

High-impact or irreversible actions conservatively escalate in this prototype.

The gate does not execute any external action.

## Re-observe

Execution success must not be inferred from the request or API call itself. The post-action state is represented separately as:

- `VERIFIED`
- `CONFLICT`
- `UNKNOWN`

The actual independent re-observation adapter is not yet connected.

## Security boundary

Never put `OPENAI_API_KEY` in browser JavaScript or GitHub Pages.

The Connection Gate runs server-side on Vercel using:

- `OPENAI_API_KEY`
- optional `OPENAI_DIRECTION_MODEL` (default: `gpt-6-luna`)

## Current evidence boundary

Confirmed by this prototype:

1. movement changes can be observed without calling an LLM;
2. model calls can be deferred until an actual COMMIT/ACTION boundary;
3. Connection, Commit, and Action concerns can remain separate;
4. UNKNOWN can be preserved instead of filled;
5. the OpenAI key stays on the server boundary.

Not yet established:

- automatic capture of real ChatGPT/tool events;
- automatic classification of real-world boundary events;
- actual tool execution behind Action Gate;
- independent post-action re-observation.

The next unresolved connection remains the Event Adapter:

```text
real AI/tool activity
        |
        v
Event Adapter   <- unresolved
        |
        v
Observer / Boundary Control
```

This branch remains isolated from `main`.
