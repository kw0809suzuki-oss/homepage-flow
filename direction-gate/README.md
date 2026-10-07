# Execution OS v0

Experimental branch-only implementation.

## Purpose

This is not an AI monitoring system.

Its purpose is to place a fact-based execution boundary between model generation and reality.

> Generation is free. Control only boundary crossings.

The core loop is:

```text
Execution Facts
        |
        v
Boundary Event Detection
        |
        v
Policy / Gate
        |
        v
Execute
        |
        v
Reality Re-observe
```

## Invariants

1. **Fact without inference**  
   Record observable execution facts without adding intent.

2. **No silent boundary crossing**  
   An unrecognized execution signal becomes `UNKNOWN`, never `FREE`.

3. **Policy only at boundary**  
   Generation and exploration do not enter control policy.

4. **Reality outranks execution logs**  
   Execution success is not verification. Reality must be re-observed.

5. **UNKNOWN is valid**  
   Missing evidence is preserved instead of filled.

## Current pipeline

```text
source-specific event
        |
        v
event-adapter.js
  normalization only
        |
        v
execution-facts.js
  immutable fact collection
        |
        v
boundary-detector.js
  deterministic exact-signal rules
        |
        +--> FREE
        +--> COMMIT
        +--> ACTION
        +--> UNKNOWN
        |
        v
execution-os.js
        |
        +--> direction observer
        +--> boundary policy
        +--> Connection Gate when required
```

The Event Adapter no longer assigns boundary meaning. It only normalizes observable source fields.

The Execution Facts Collector intentionally drops upstream boundary claims. Boundary classification is produced independently by the Detector.

## Execution Facts Collector

Canonical fact fields:

```text
factType
source
sourceEventId
target
resultDestination
continuationFrom
timestamp
evidence
```

The Collector does not store inferred intent or a guessed goal.

## Boundary Detector v0

The Detector is deterministic and uses exact known signals.

Current FREE signals:

```text
search
read
inspect
compare
generate
draft
draft_edit
response.completed
response.in_progress
response.created
```

Current COMMIT signals:

```text
commit
file_write
memory_write
record_write
state_write
```

Current ACTION signals:

```text
send
publish
permission_change
external_action
purchase
delete
agent.session.action_required
```

Everything else:

```text
UNKNOWN
```

This is deliberate. Unknown signals are not silently treated as free exploration.

The v0 goal is not semantic completeness. It is to establish the invariant:

> If the detector does not know, it does not waive the boundary.

## Policy components

### Connection Gate

Checks only whether a detected COMMIT/ACTION boundary is still connected to the human-placed direction.

States:

- `CONNECTED`
- `OPEN_UNKNOWN`
- `CONTINUING_ELSEWHERE`

It does not infer a replacement goal and does not authorize the action itself.

### Commit Gate

Uses explicit policy metadata:

- epistemic state
- provenance
- authority
- freshness

Results:

- `ALLOW`
- `HOLD`
- `UNKNOWN`

### Action Gate

Uses explicit policy metadata:

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

## Reality Re-observe

The status vocabulary remains:

- `VERIFIED`
- `CONFLICT`
- `UNKNOWN`

But an independent reality adapter is **not yet connected**.

A tool/API success response must not itself become `VERIFIED`.

Example for GitHub:

```text
execution says commit succeeded
        |
        v
fetch GitHub branch/file/commit again
        |
        +--> matches    -> VERIFIED
        +--> conflicts  -> CONFLICT
        +--> unavailable -> UNKNOWN
```

## Current evidence

Already observed in the live prototype:

```text
B exploration
→ no model call

B continuation
→ no model call

COMMIT boundary
→ Connection Gate invoked

Commit policy
→ ALLOW

Connection evidence insufficient
→ OPEN_UNKNOWN

Final control
→ UNKNOWN
```

One measured Luna call:

- input: 326 tokens
- output: 44 tokens
- reasoning: 0 tokens
- total: 370 tokens

This demonstrates the intended behavior: exploration remains free while commitment can be held.

## Hard boundary

This project does **not** claim access to every internal ChatGPT conversation turn or tool call.

No source event means no invented Execution Fact.

Current practical sources include controlled API/agent runtimes, Vercel functions, GitHub events, custom tools/apps, and explicit Flow World events.

## Next unresolved step

Connect one real tool/runtime execution source to the Execution Facts Collector and connect a matching Reality Re-observe adapter to the same external system.

Do not broaden the Detector into a semantic LLM classifier unless deterministic signals are genuinely insufficient.

This branch remains isolated from `main`.
