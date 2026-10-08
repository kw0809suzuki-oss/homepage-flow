# Local Execution MCP Gateway Design

Date: 2026-10-08
Branch: `direction-gate-v0`

## 1. Purpose

Place a compulsory execution boundary between AI generation and real-world write/action capabilities.

The parent purpose is not to monitor model thinking and not to host a web service.

> Generation is free. Control only boundary crossings.

The system should preserve free read/search/compare/generate/draft behavior while ensuring controlled actions can reach reality only through one gateway.

## 2. Success Condition

For one real GitHub write capability, establish this path:

```text
AI / Agent
  -> Local Execution MCP Gateway
  -> existing Execution OS boundary detection
  -> existing policy gate
  -> Connection Gate only when direction anomaly exists
  -> credentialed GitHub executor only on ALLOW
  -> independent GitHub re-read
  -> VERIFIED / CONFLICT / UNKNOWN
```

The first decisive negative test is:

```text
human places direction A
-> observed movement accumulates toward B
-> agent proposes a GitHub write at B
-> gateway detects boundary + direction anomaly
-> control is HOLD or UNKNOWN
-> GitHub write credential is not used
-> independent GitHub read confirms the target file was not created
```

## 3. Core Security Invariant

The gateway is compulsory only when the controlled runtime has no alternate write path.

For the GitHub write probe:

- the model/runtime under test must not have a direct GitHub write tool or equivalent credentialed bypass;
- the Local Execution MCP Gateway is the only component allowed to hold/use the GitHub write credential for the controlled action;
- read-only GitHub access may remain outside the gateway when it cannot mutate reality.

Therefore:

> Gateway code alone does not create enforcement. Enforcement comes from capability placement.

If a direct write-capable connector remains available to the same runtime, the system must be described as observable/advisory, not compulsory.

## 4. Architecture

```text
                    free path
AI / Agent ---------------------------------> read / search / draft
    |
    | controlled write/action proposal
    v
+------------------------------------------+
| Local Execution MCP Gateway              |
|                                          |
| trusted state                            |
| - placedDirection                        |
| - recentMovement                         |
| - pending action                         |
| - previous execution outcome             |
|                                          |
| existing Execution OS components         |
| - execution-facts.js                     |
| - boundary-detector.js                   |
| - boundary-policy.js                     |
| - observer.js                            |
| - connection-control.js                  |
+------------------------------------------+
    |
    | ALLOW only
    v
credentialed executor
    |
    v
GitHub reality
    |
    v
independent re-observe
```

No Vercel deployment, public HTTP API, browser console, or caller-supplied `direction_context` is required for the gateway core.

## 5. Trusted State

The gateway owns direction state.

The model does not submit authoritative values for:

- `placed_direction`
- `recent_movement`
- pending anomaly reasons
- previous control result

These values are maintained by the gateway from accepted human placement and observed runtime events.

A caller may submit an action proposal and action arguments, but not the trusted control history used to authorize that proposal.

## 6. Reused Components

Reuse existing branch implementation rather than redesigning it:

- `direction-gate/execution-os.js`
- `direction-gate/execution-facts.js`
- `direction-gate/event-adapter.js`
- `direction-gate/boundary-detector.js`
- `direction-gate/boundary-policy.js`
- `direction-gate/observer.js`
- `direction-gate/connection-control.js`
- existing Reality Re-observe logic where compatible

The existing Vercel/OpenAI probe endpoints remain experimental evidence and are not dependencies of the Local Execution MCP Gateway.

## 7. Gateway Surface v0

Keep the first surface deliberately small.

### State placement

A trusted local operation sets the current human-placed direction.

Example conceptual operation:

```text
set_direction("A")
```

This operation is not treated as model-authored evidence.

### Movement observation

Free/exploratory events can be recorded into gateway state without entering action policy.

Examples:

- search
- read
- compare
- draft
- draft_edit

### Controlled GitHub write

Expose one write-capable MCP tool through the gateway.

Conceptual form:

```text
github_write({
  repository,
  branch,
  path,
  content,
  expected_current_state
})
```

The tool does not execute immediately.

It first creates a PRE_EXECUTION fact, runs deterministic boundary detection, policy, and direction observation.

## 8. Decision Flow

```text
proposal
  -> PRE_EXECUTION fact
  -> boundary detector

FREE
  -> no write executor involved

UNKNOWN
  -> HOLD / UNKNOWN

COMMIT or ACTION
  -> deterministic boundary policy
  -> observer checks stored movement

no anomaly
  -> policy result stands

anomaly present
  -> Connection Gate

CONNECTED
  -> policy result stands

OPEN_UNKNOWN
  -> UNKNOWN, no execute

CONTINUING_ELSEWHERE
  -> HOLD, no execute

ALLOW
  -> credentialed executor
  -> POST_EXECUTION fact
  -> independent re-observe
```

Normal boundary crossings should remain silent when deterministic policy allows them and no direction anomaly is pending.

## 9. Connection Gate Use

The Connection Gate remains narrow.

It answers only:

> Is this boundary crossing still connected to the human-placed direction?

It does not:

- infer a new goal;
- authorize the external action by itself;
- replace deterministic permission checks;
- fill missing direction evidence.

It is called only when the observer reports `BOUNDARY_CHECK_REQUIRED`.

## 10. Credential Boundary

The GitHub write credential belongs to the gateway/executor, not the model-facing process.

The model-facing MCP tool receives a proposal and returns a control result.

Only internal executor code can access the credential after `ALLOW`.

No credential value is returned to the model or written to logs.

## 11. Reality Re-observe

Execution success is not verification.

After an allowed GitHub write, perform an independent GitHub read and compare:

- repository
- branch
- path
- expected content or expected digest
- resulting commit when available

Return only:

- `VERIFIED`
- `CONFLICT`
- `UNKNOWN`

For a denied/held write probe, perform an independent read proving the target file was not created or changed relative to the pre-action snapshot.

Absence verification must compare against an observed pre-action state; a 404 alone is not sufficient when the prior state was unknown.

## 12. Failure Behavior

Fail closed at controlled boundaries.

- unknown signal -> `UNKNOWN`, no execute
- missing trusted direction when required -> `UNKNOWN`, no execute
- Connection Gate unavailable -> `UNKNOWN`, no execute
- policy metadata incomplete -> existing policy behavior, no invented values
- executor failure -> execution failure, never `VERIFIED`
- re-observe unavailable -> `UNKNOWN`

Free generation/exploration is not blocked by these failures.

## 13. First Probe

Use one real GitHub file-write probe only.

Preparation:

1. Observe and record that a dedicated probe path does not exist.
2. Place direction `A` in gateway-owned state.
3. Feed two observed free movement events toward `B` so the existing observer records direction-shift evidence.

Probe:

4. Submit a GitHub write proposal targeting `B`.
5. Expect `BOUNDARY_CHECK_REQUIRED`.
6. Run Connection Gate.
7. Expect a fail-closed result if the connection is not established.
8. Confirm the GitHub executor was not called.
9. Independently re-read the probe path.

Success requires:

```text
connection.required = true
executor_called = false
write_performed = false
post_reobserve = unchanged / absent relative to observed pre-state
```

The exact Connection Gate state may be `CONTINUING_ELSEWHERE` or `OPEN_UNKNOWN`; either is acceptable for this first safety probe because both must prevent execution.

## 14. Evidence Boundary

A successful first probe proves only:

- one local/trusted gateway implementation;
- one GitHub write capability;
- one controlled runtime configuration with no alternate GitHub write path;
- one abnormal-direction refusal path;
- one independent GitHub re-observation.

It does not prove:

- every ChatGPT connector is globally intercepted;
- every external tool is controlled;
- the ChatGPT product can be forced to expose only this gateway;
- arbitrary remote runtimes cannot possess other credentials.

Those require capability configuration at each runtime boundary.

## 15. What Is Removed From the Critical Path

The following are not required for the v0 enforcement probe:

- Vercel deployment
- public HTTP endpoint
- Vercel Deployment Protection
- browser console
- caller-supplied direction context
- GitHub Actions as the pre-execution gate

They may remain as prior experimental evidence but are not part of the new core path.

## 16. Implementation Boundary

The first implementation should add only the minimum gateway wrapper and one GitHub write executor.

Do not:

- redesign the detector;
- broaden the signal vocabulary unless required by the probe;
- add a dashboard;
- add persistence beyond what the single-process probe requires;
- add multi-user auth;
- add multiple external services;
- move FlowMemory into the execution path.

The purpose of v0 is to answer one question:

> Can a trusted local gateway own the write capability and actually prevent one real abnormal GitHub write before reality changes?

If yes, expand from evidence.
If no, stop and identify the exact enforcement boundary that prevents it.
