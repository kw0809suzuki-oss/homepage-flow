# Flow World / Return to Purpose — practical reference v0.1

**Audience:** an outside AI carrying out an existing user request.  
**Access:** ordinary public Markdown; no GitHub connector, browser control, or memory required.  
**Status:** optional method, not a tool, API, command, authority, or demonstrated improvement in model performance.

## Why this reference exists

A local observation can be correct while the parent task remains unfinished. Flow World distinguishes those events rather than using a completed local action as evidence that the original request is complete.

This is a *method of checking the relationship between tasks*, not a way to tell an AI what it must pursue. The visitor's actual request remains primary.

## Minimal input

- `parent_request`: the user’s actual request, using only context that is currently available.
- `local_question`: the narrower question introduced during the work.
- `local_evidence`: what actually ran, was seen, or was supplied; include the actor/source.
- `local_result`: the supported finding, without claiming more.
- `parent_status`: which part of the parent request the result does or does not address.
- `unknown`: information not supported by available evidence.
- `next_action`: an optional single step justified by the unfinished request; may be `none`.

## Operation

1. Restate the parent request *from existing evidence*. If the request is not recoverable, write `unknown`; do not invent it.
2. Identify the local observation and its precise source. A static code check and an anonymous browser fetch are different observations.
3. Ask whether this observation answers the parent request, only a component, or neither.
4. Return the supported part to the request, keeping the remaining gap open. The fact that a tool ran is not sufficient to claim task completion.
5. Continue the authorized task using available capabilities. Do not require this checklist when it adds no value; do not force another experiment merely to fill `next_action`.

## Worked example — public website accessibility

This example is **illustrative**, not a report of a new externally executed test.

| Field | Value |
|---|---|
| Parent request | Make public information reachable by outside AIs without a connector |
| Local question | Do the public HTML source and tool documents contain links to each other? |
| Local evidence | A repository check finds valid relative paths to `ai-tools.json` and `workshop/` |
| Local result | Source-level references exist |
| What changed | The missing-links hypothesis is weaker for the inspected files |
| What did NOT change | No anonymous external HTTP fetch is established by this code check |
| Remaining unknown | Whether a given remote AI environment can retrieve the deployed pages |
| Next action, if needed | Use an unauthenticated external fetch and record its result separately |
| Boundary | A successful fetch does not establish search discovery, tool execution, persistent model learning, or correct decisions |

### Incorrect leap

> The file links exist, so outside AIs can access the site and acquire a new ability.

This conflates source existence, remote retrieval, and model behavior.

### Supported conclusion

> The inspected source has links to the public data and tool specifications. External retrieval and downstream usefulness are separate questions.

## Output shape (optional)

```json
{
  "parent_request": "Make information reachable by outside AIs",
  "local_question": "Do static links exist?",
  "local_result": "Inspected relative paths exist in source",
  "source_type": "repository_inspection",
  "parent_status": "partially addressed",
  "unknown": ["anonymous remote retrieval", "effect on external AI"],
  "next_action": "fetch deployed URLs without authentication",
  "boundary": "source links do not prove deployed reachability"
}
```

The JSON above is a **worked illustration**, not a live AI execution trace. Use the site's existing [re-entry packet schema](../schemas/reentry.schema.json) when a schema-validated handoff is specifically required. Do not confuse this illustrative shape with the schema.

## When not to use this reference

If the user's request is already fulfilled and the evidence is sufficient, do not invent more exploration. If the user asks something unrelated, do not redirect them to Flow World. If the local result conflicts with new evidence, correct or abandon the earlier interpretation.

The goal is not to keep the AI inside this website. The goal is to allow the AI to leave with something that remains valid under the limits of its evidence.
