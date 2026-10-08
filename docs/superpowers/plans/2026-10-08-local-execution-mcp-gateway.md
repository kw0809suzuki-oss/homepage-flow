# Local Execution MCP Gateway Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the smallest local/trusted execution gateway that owns one GitHub write capability and proves that an abnormal-direction write is stopped before GitHub changes.

**Architecture:** Reuse the existing Execution OS detector, policy, observer, and connection-control modules. Add a local gateway core that owns trusted direction/movement state, a GitHub executor that reads its credential only after `ALLOW`, a thin MCP stdio adapter exposing only the controlled write tool, and one live negative probe with independent GitHub re-read. Vercel and public HTTP are outside the critical path.

**Tech Stack:** Node.js ESM, Node built-in test runner, official Model Context Protocol JavaScript SDK for the stdio adapter, GitHub REST API via `fetch`.

**Spec:** `docs/superpowers/specs/2026-10-08-local-execution-mcp-gateway-design.md`

## Global Constraints

- Reuse existing `direction-gate/` components; do not redesign the detector or policy.
- The model-facing surface must not accept authoritative `placed_direction`, `recent_movement`, pending reasons, or previous control result.
- GitHub write credential access occurs only inside the executor and only after final control decision `ALLOW`.
- Unknown boundary, missing trusted state, failed connection check, or incomplete policy must fail closed for controlled writes.
- Vercel, public HTTP endpoints, browser console, GitHub Actions pre-execution gating, and FlowMemory are not dependencies of v0.
- v0 controls one GitHub file-write capability only.
- A direct alternate GitHub write tool/credential in the same runtime invalidates any claim of compulsory enforcement.

## Review Focus

- Missing human-placed direction at write time must return `UNKNOWN` and never touch the credential.
- Unknown/unrecognized write signal must never fall through to the executor.
- Connection-check failure/unavailability after `BOUNDARY_CHECK_REQUIRED` must prevent execution.
- An `ALLOW` policy must still not execute when connection state is `OPEN_UNKNOWN` or `CONTINUING_ELSEWHERE`.
- Negative re-observation must compare against a known pre-action state; a post-action 404 alone must not be promoted to proof.

---

## File Structure

- Create `execution-gateway/package.json` — local gateway dependency/runtime boundary only.
- Create `execution-gateway/gateway-state.mjs` — trusted direction and observed-movement state; no model-facing setters.
- Create `execution-gateway/gateway-control.mjs` — PRE_EXECUTION fact, existing detector/policy/observer integration, final ALLOW/HOLD/UNKNOWN decision.
- Create `execution-gateway/github-executor.mjs` — sole GitHub write credential access and REST write call.
- Create `execution-gateway/github-reobserve.mjs` — independent pre/post GitHub file observation and comparison.
- Create `execution-gateway/mcp-server.mjs` — thin stdio MCP adapter exposing only controlled `github_write`.
- Create `execution-gateway/abnormal-write-probe.mjs` — trusted probe harness seeding A → B → B and invoking the same gateway core used by MCP.
- Create colocated `*.test.mjs` files for each unit whose behavior is safety-critical.
- Modify `direction-gate/README.md` only after the live probe, recording actual evidence and its boundary.

### Task 1: Trusted Gateway State

**Files:**
- Create: `execution-gateway/gateway-state.mjs`
- Test: `execution-gateway/gateway-state.test.mjs`

**Interfaces:**
- Consumes: none.
- Produces:
  - `createGatewayState(placedDirection: string) -> GatewayState`
  - `recordObservedMovement(state: GatewayState, event: MovementEvent) -> GatewayState`
  - `snapshotTrustedState(state: GatewayState) -> { placedDirection, recentMovement }`
- `GatewayState` keeps `placedDirection` and movement history private to the gateway module's state object; callers receive snapshots, not mutators through MCP.

- [ ] **Step 1: Write failing tests for trusted state**

Tests:
- `createGatewayState("")` produces a state whose snapshot has an empty direction and no movement.
- `createGatewayState("A")` preserves exactly `A`.
- two `recordObservedMovement` calls toward `B` appear in order in `snapshotTrustedState`.
- movement history is capped at the existing observer-compatible last 8 events.

- [ ] **Step 2: Run the state tests and verify failure**

Run: `node --test execution-gateway/gateway-state.test.mjs`  
Expected: FAIL because `gateway-state.mjs` does not exist.

- [ ] **Step 3: Implement the state module**

Implement only the three interfaces above. Normalize strings the same way `connection-control.js` expects, and cap history at 8.

- [ ] **Step 4: Run the state tests**

Run: `node --test execution-gateway/gateway-state.test.mjs`  
Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `feat: add trusted execution gateway state`

### Task 2: Control Decision Without Credential Access

**Files:**
- Create: `execution-gateway/gateway-control.mjs`
- Test: `execution-gateway/gateway-control.test.mjs`
- Reuse: `direction-gate/execution-facts.js`
- Reuse: `direction-gate/boundary-detector.js`
- Reuse: `direction-gate/execution-os.js`
- Reuse: `direction-gate/boundary-policy.js`
- Reuse: `direction-gate/connection-control.js`

**Interfaces:**
- Consumes:
  - trusted snapshot from Task 1.
  - `connectionCheck(payload) -> Promise<{ state: "CONNECTED" | "OPEN_UNKNOWN" | "CONTINUING_ELSEWHERE" }>`.
- Produces:
  - `evaluateGithubWrite({ trustedState, proposal, connectionCheck }) -> Promise<ControlResult>`
  - `ControlResult` fields: `decision`, `reasons`, `detection`, `route`, `policy`, `connection`, `preFact`.
- This task does not import or call the GitHub executor.

- [ ] **Step 1: Write failing tests for the abnormal path and Review Focus cases**

Tests must assert:
- trusted state `A` plus two observed `B` movements plus a `file_write` proposal at `B` produces `BOUNDARY_CHECK_REQUIRED`.
- `CONTINUING_ELSEWHERE` produces final `HOLD`.
- `OPEN_UNKNOWN` produces final `UNKNOWN`.
- thrown/rejected `connectionCheck` produces final `UNKNOWN` and reason `CONNECTION_CHECK_FAILED`.
- empty placed direction produces `UNKNOWN` without calling `connectionCheck`.
- an unrecognized fact type injected through the internal test seam produces `UNKNOWN`, never `ALLOW`.

- [ ] **Step 2: Run the control tests and verify failure**

Run: `node --test execution-gateway/gateway-control.test.mjs`  
Expected: FAIL because the control module does not exist.

- [ ] **Step 3: Implement `evaluateGithubWrite`**

Create a PRE_EXECUTION `file_write` fact, route it through the existing detector/router, apply the existing Commit Gate with explicit observed/provenance/authority/freshness metadata supplied by the trusted gateway wrapper, then use `observeBoundaryConnection`. Call `connectionCheck` only when the observer requires it. Use `combineBoundaryAndConnection` for the final decision.

- [ ] **Step 4: Run the control tests**

Run: `node --test execution-gateway/gateway-control.test.mjs direction-gate/connection-control.test.mjs`  
Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `feat: gate github writes with trusted direction state`

### Task 3: Credentialed GitHub Executor and Independent Re-observe

**Files:**
- Create: `execution-gateway/github-executor.mjs`
- Create: `execution-gateway/github-reobserve.mjs`
- Test: `execution-gateway/github-executor.test.mjs`
- Test: `execution-gateway/github-reobserve.test.mjs`

**Interfaces:**
- Produces:
  - `executeGithubWrite(proposal, { readCredential, fetchImpl }) -> Promise<ExecutionResult>`
  - `observeGithubFile({ repository, branch, path, fetchImpl }) -> Promise<FileObservation>`
  - `compareNegativeWrite(preObservation, postObservation) -> ReobserveResult`
- `readCredential() -> string` is invoked inside `executeGithubWrite`, never by control code.

- [ ] **Step 1: Write failing executor tests**

Tests:
- executor calls `readCredential` exactly once when invoked.
- missing credential returns an execution failure and never claims `VERIFIED`.
- REST request uses the exact repository/branch/path proposal and does not expose the token in the returned result.

- [ ] **Step 2: Write failing re-observe tests**

Tests:
- known pre-state absent + post-state absent => `VERIFIED` for the negative probe.
- unknown pre-state + post-state absent => `UNKNOWN`.
- known pre-state present and unchanged + post-state same => `VERIFIED` for "unchanged".
- known pre-state absent + post-state present => `CONFLICT`.

- [ ] **Step 3: Run both test files and verify failure**

Run: `node --test execution-gateway/github-executor.test.mjs execution-gateway/github-reobserve.test.mjs`  
Expected: FAIL because modules do not exist.

- [ ] **Step 4: Implement executor and re-observer**

Use GitHub Contents REST endpoints through injected `fetchImpl`. The executor reads `GITHUB_TOKEN` only through the injected/default `readCredential` at execution time. The observer uses a separate GET path and records enough state to distinguish known absence, known presence, and unavailable/unknown.

- [ ] **Step 5: Run executor/re-observe tests**

Run: `node --test execution-gateway/github-executor.test.mjs execution-gateway/github-reobserve.test.mjs`  
Expected: PASS.

- [ ] **Step 6: Commit**

Commit message: `feat: add gated github executor and reobserve`

### Task 4: Gateway Orchestrator Must Not Touch Credential on HOLD/UNKNOWN

**Files:**
- Create: `execution-gateway/gateway.mjs`
- Test: `execution-gateway/gateway.test.mjs`

**Interfaces:**
- Consumes Tasks 1–3.
- Produces:
  - `createExecutionGateway({ placedDirection, connectionCheck, executor, observer }) -> ExecutionGateway`
  - `gateway.recordMovement(event)`
  - `gateway.githubWrite(proposal) -> Promise<GatewayResult>`
- `GatewayResult` includes `control`, `executorCalled`, `execution`, and `reobserve`.

- [ ] **Step 1: Write failing orchestration tests**

Tests:
- abnormal A → B → B with `CONTINUING_ELSEWHERE` returns `HOLD`, `executorCalled:false`, and executor spy count 0.
- abnormal A → B → B with `OPEN_UNKNOWN` returns `UNKNOWN`, `executorCalled:false`.
- connection checker rejection returns `UNKNOWN`, executor spy count 0.
- missing direction returns `UNKNOWN`, executor spy count 0.
- normal connected/no-anomaly path with policy `ALLOW` calls executor exactly once.
- credential-reader spy attached behind executor remains untouched in every HOLD/UNKNOWN case.

- [ ] **Step 2: Run the gateway tests and verify failure**

Run: `node --test execution-gateway/gateway.test.mjs`  
Expected: FAIL because `gateway.mjs` does not exist.

- [ ] **Step 3: Implement the orchestrator**

Control first. Only when final decision is `ALLOW` may it call the executor. For denied/unknown outcomes it may call only the independent observer required to verify unchanged reality; it must not call executor or credential reader.

- [ ] **Step 4: Run all local safety tests**

Run: `node --test execution-gateway/*.test.mjs direction-gate/connection-control.test.mjs`  
Expected: all PASS.

- [ ] **Step 5: Commit**

Commit message: `feat: enforce gateway before github execution`

### Task 5: Thin MCP stdio Adapter

**Files:**
- Create: `execution-gateway/package.json`
- Create: `execution-gateway/mcp-server.mjs`
- Test: `execution-gateway/mcp-server.test.mjs`

**Interfaces:**
- Consumes `createExecutionGateway` from Task 4.
- Produces one model-facing MCP tool: `github_write`.
- Trusted state placement and movement-recording methods are not registered as MCP tools.

- [ ] **Step 1: Add the local package boundary and MCP SDK dependency**

Create `execution-gateway/package.json` with `"type":"module"`, a private package, test script using `node --test`, and the official `@modelcontextprotocol/sdk` dependency. Generate and commit the lockfile during implementation.

- [ ] **Step 2: Write a failing MCP surface test**

Test asserts the registered model-facing tool list contains `github_write` and does not contain `set_direction`, `record_movement`, or any credential/admin tool.

- [ ] **Step 3: Run the MCP surface test and verify failure**

Run from `execution-gateway/`: `npm test -- mcp-server.test.mjs`  
Expected: FAIL until the adapter is implemented.

- [ ] **Step 4: Implement the stdio adapter**

The adapter receives trusted state from process construction/bootstrap, registers only `github_write`, converts tool arguments into the Task 4 proposal shape, and returns the gateway result. It must not accept `placed_direction` or `recent_movement` in the tool schema.

- [ ] **Step 5: Run the MCP test and full test suite**

Run: `node --test execution-gateway/*.test.mjs direction-gate/connection-control.test.mjs`  
Expected: all PASS.

- [ ] **Step 6: Commit**

Commit message: `feat: expose controlled github write over local mcp`

### Task 6: One Live Abnormal-Direction GitHub Probe

**Files:**
- Create: `execution-gateway/abnormal-write-probe.mjs`
- Modify after evidence only: `direction-gate/README.md`

**Interfaces:**
- Uses the same Task 4 gateway core and Task 3 GitHub observer.
- Probe path: `direction-gate/runtime-probes/local-gateway-blocked-v0.txt`.
- Target repository/branch: `kw0809suzuki-oss/homepage-flow` / `direction-gate-v0`.

- [ ] **Step 1: Pre-observe the probe path**

Run the probe in preflight mode. It must record an explicit known pre-state for the exact repository, branch, and path. If the path exists, stop and choose a new dedicated path before attempting the control probe.

Expected: `preObservation.state = "ABSENT"`.

- [ ] **Step 2: Seed trusted state and movement inside the probe harness**

Construct the gateway with placed direction `A`. Record two trusted observed free movements toward `B`. Do not pass these fields through the model-facing MCP tool.

- [ ] **Step 3: Submit the write proposal through the same gateway core**

Proposal target must be the dedicated GitHub probe path and fact type `file_write`. Use a connection checker that exercises the real Connection Gate implementation if an API key is locally available; otherwise the probe must fail closed as `UNKNOWN` and explicitly report that the model-based connection checker was unavailable.

- [ ] **Step 4: Assert no executor/credential use**

Required assertions:
- observer reports `BOUNDARY_CHECK_REQUIRED`;
- final decision is not `ALLOW`;
- `executorCalled === false`;
- credential-reader call count is 0.

If any assertion fails, stop without trying a compensating delete.

- [ ] **Step 5: Independently re-read GitHub**

Use the Task 3 observer via a separate GET after the control result. Compare it with the pre-observation.

Required result: `VERIFIED` unchanged/absent relative to the known pre-state.

- [ ] **Step 6: Record only observed evidence in README**

Add a short section to `direction-gate/README.md` with:
- exact branch/path;
- control result;
- whether Connection Gate was actually called or failed closed before call;
- `executorCalled:false`;
- credential access count 0;
- pre/post GitHub observations;
- evidence boundary: this proves one controlled local gateway configuration, not global interception of ChatGPT connectors.

- [ ] **Step 7: Run final regression tests**

Run: `node --test execution-gateway/*.test.mjs direction-gate/*.test.mjs`  
Expected: all PASS.

- [ ] **Step 8: Commit**

Commit message: `test: verify local gateway blocks abnormal github write`

## Completion Gate

Do not claim compulsory enforcement merely because the code or probe passes.

The final report must separately state:

- **Confirmed:** the local gateway prevented the one abnormal GitHub write and the credential was not accessed.
- **Confirmed only if configured:** the controlled runtime had no alternate GitHub write capability during the probe.
- **Unknown / not proven:** global ChatGPT connector interception, arbitrary remote-runtime enforcement, and other external action types.

If the runtime cannot be configured without an alternate direct write path, stop and report that exact capability-placement boundary instead of weakening the claim.
