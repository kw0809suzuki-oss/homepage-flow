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


## Reality Re-observe v0 — GitHub file_write probe

A real GitHub write/read probe was executed on this branch.

Expected state:

```text
repo: kw0809suzuki-oss/homepage-flow
branch: direction-gate-v0
path: direction-gate/reobserve-probe-v0.txt
content:
execution-os-reobserve-v0
probe=github-file-write
expected=verified
```

Execute returned commit:

```text
277fc4d60812f4aba40fab23f75777013670babc
```

That execute response was **not** accepted as verification.

A separate GitHub read then observed:

- the file exists on `direction-gate-v0`;
- its content exactly matches the expected content;
- commit `277fc4d60812f4aba40fab23f75777013670babc` exists in GitHub;
- the commit diff contains the expected file and exact probe content.

Result:

```text
VERIFIED
```

This establishes the Reality Re-observe principle for one real `file_write` case.

### Evidence boundary

This probe was orchestrated externally: Execute and Re-observe were separate GitHub operations initiated by the assistant.

Therefore it does **not** yet establish an autonomous runtime loop from tool execution into the Execution OS.

Confirmed:

```text
GitHub write
→ independent GitHub re-fetch
→ deterministic comparison
→ VERIFIED
```

Still unresolved:

```text
real tool runtime
→ automatic Execution Fact emission
→ detector
→ execute
→ automatic re-observe
```

The next integration problem is automation of that source/runtime handoff, not redesign of the Detector.

## Automatic handoff v0 — GitHub Actions evidence

The first live automatic source handoff is now connected for pushes to `direction-gate-v0`.

Path:

```text
real GitHub push
        |
        v
GitHub Actions
        |
        v
git diff of the pushed revision
        |
        v
Execution Facts Collector
        |
        v
Boundary Detector
```

Implementation:

- `.github/workflows/execution-os-handoff.yml`
- `scripts/execution-os-github-handoff.mjs`

The workflow has only `contents: read` permission and requires no new secret or public receiver endpoint.

### Observed run

For push commit:

```text
06c2d295f894b09df07623aaf569eb106ed02f94
```

GitHub Actions automatically produced:

```text
handoff: AUTOMATIC
runtime: github-actions
record_status: RECORDED
factType: file_write
source: github-actions-push
target: scripts/execution-os-github-handoff.mjs
classification: COMMIT
reason: KNOWN_COMMIT_SIGNAL
```

No Execution Fact was manually injected for this run.

This establishes:

```text
real GitHub push
→ automatic runtime handoff
→ Execution Facts Collector
→ deterministic Boundary Detector
```

### Evidence boundary

Not yet automatic:

```text
Detector
→ Policy / Gate
→ Execute
→ Reality Re-observe
```

The automatic handoff is confirmed only through Collector and Detector.

Do not infer full autonomous Execution OS closure from this result.

## Execution phase separation — observed evidence

Execution Facts now carry an explicit phase:

```text
PRE_EXECUTION
POST_EXECUTION
UNSPECIFIED
```

Routing rule:

```text
PRE_EXECUTION + boundary
→ Policy / Gate

POST_EXECUTION + boundary
→ Reality Re-observe

UNSPECIFIED + boundary
→ HOLD / UNKNOWN
```

This prevents a completed action from being retroactively treated as a pre-action authorization request.

### Automatic post-execution run

For GitHub push commit:

```text
78ae384cf9306d72b6056c66d7d88a33f357f0b2
```

the automatic runtime produced:

```text
record_status: RECORDED
factType: file_write
phase: POST_EXECUTION
classification: COMMIT
route: REALITY_REOBSERVE
reality_source: github-rest-refetch
reobserve.status: VERIFIED
```

The re-observation was a separate GitHub REST read performed after the push event. The push event itself was not accepted as verification.

This establishes the automatic post-execution path:

```text
real GitHub push
→ Execution Fact
→ Boundary Detection
→ POST_EXECUTION routing
→ independent GitHub re-fetch
→ VERIFIED
```

Still unresolved:

```text
PRE_EXECUTION runtime event
→ Policy / Gate
→ Execute
→ POST_EXECUTION fact
→ Reality Re-observe
```

The next integration target is therefore a controllable pre-execution runtime surface, not further changes to the GitHub post-execution detector.

## PRE_EXECUTION → real write → automatic Reality Re-observe probe

A controlled real GitHub file write was executed only after the existing PRE_EXECUTION policy path was evaluated first.

Proposal:

```text
kind: file_write
phase: PRE_EXECUTION
target: direction-gate/runtime-probes/preexec-reality-v0.txt
```

Pre-execution result:

```text
Boundary Detector: COMMIT
route: POLICY_GATE
Commit Gate: ALLOW
```

After ALLOW, the real GitHub write produced commit:

```text
8cae6cb195e3a71cd5688aeecbc6e800033f2321
```

The existing automatic post-execution runtime then observed:

```text
record_status: RECORDED
factType: file_write
phase: POST_EXECUTION
classification: COMMIT
route: REALITY_REOBSERVE
reality_source: github-rest-refetch
reobserve.status: VERIFIED
```

This establishes one real controlled path:

```text
PRE_EXECUTION
→ deterministic boundary detection
→ Commit Gate ALLOW
→ real GitHub write
→ automatic POST_EXECUTION fact
→ independent GitHub re-fetch
→ VERIFIED
```

Evidence boundary:

The PRE_EXECUTION step was orchestrated by the current controlling session before invoking the GitHub write. It is not yet an independently auto-triggered external runtime.

Therefore the remaining gap is specifically:

```text
external tool proposal
→ automatic PRE_EXECUTION handoff
→ existing control path
```

Do not treat this probe as proof of a fully autonomous pre-execution runtime.
