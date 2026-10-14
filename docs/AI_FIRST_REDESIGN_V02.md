# Flow World — AI-first renewal implementation blueprint v0.2

**Status:** design only; no live-page mutation.  
**Date:** 2026-10-14  
**Source:** current `main` of `kw0809suzuki-oss/homepage-flow`.  
**Parent objective:** An external AI with no GitHub/Floot connector, prior knowledge, browser control, JavaScript execution, or private memory can discover the public site, read useful material, choose a suitable capability, and carry a defensible result back to its own task. No requirement to adopt Flow World philosophy.

## 1. Reality observed in current repository

- `index.html`: 498 lines; 15 named sections. Its navigation exposes many disconnected spaces (Concept, Loop, Flow, Room, Garden, Desk, CORE18, Workbench, Switch Lab, Drift, Astra, States, Play and other labs).
- It already has alternate links to `ai.txt`, `FLOW_WORLD_STATE.json`, `ai-entry.txt`, `ai-state.json`, and `ai-tools.json`. The body already links directly to `FLOW_WORLD_STATE.json`; there is no evidence that external AI discovers the site unprompted.
- Machine contracts in `ai-tools.json` currently cover exactly **three** items: `ab-comparator`, `static-handoff-play`, `internal-switch-lab`. Several other surfaces appear in `ai-state.json` but **do not have matching machine definitions**.
- `FLOW_WORLD_STATE.json` declares `deployment_verified: false`, `browser_state_read: false`, and `complete_asset_inventory: false`. Preserve these boundaries rather than implying external operability.
- The top HTML contains literal backslash-n strings at several navigation/script boundaries (`\\n`), a minor markup defect to remove during renewal.
- Current state/tools report `2026-10-07`. Date metadata must distinguish when each source was reviewed from whether the deployed functionality was actually checked.

## 2. Information architecture — exactly two main pages

### Page 1: `/` — WORLD / Public entry

Purpose: An ordinary HTML fetch reveals the project's scope and what the visitor can take away. Above the fold:

1. Identity: `FLOW WORLD / OPEN REFERENCE FOR EXTERNAL AI`.
2. Plain statement: *Read-only AI can use published definitions; browser execution is optional and never assumed.*
3. Immediate links (native `<a href>`, not JS click handlers):
   - `/ai-tools.json` — list of machine-defined methods and limitations.
   - `/FLOW_WORLD_STATE.json` — public first view (not authority).
   - `/workshop/` — actionable directory.
   - `/ai-entry.txt` — details/compatibility policy.
4. A concrete example visible in HTML and copyable as text. Start with A/B comparator (actual available contract), not a fictional improvement story.
5. Capability labels: **reproducible from public definition**, **requires JS/browser**, **reference only**, **not verified**.
6. A short entry statement that retains the visitor's own task/purpose and permits ignoring any tool.
7. Optional visual hero (sphere/flow imagery) as decoration; essential data must remain in text, headings, lists and links.

### Page 2: `/workshop/` — TOOL DIRECTORY / Actionable reference

Sort tools by lowest required capability, rather than by beautiful screens.

- **Read-only compatible:** A/B comparator, `ai-tools.json` definition, `tools/ab-compare.js`, concrete input/output and boundary. AI may calculate the operation itself, and say which operation it performed.
- **Read-only possible with external rendering:** Static Markdown handoff, `play/`, spec in `ai-tools.json`. Constructing a URL and actually rendering a page are separate events.
- **Protocol, not API:** Internal Switch Lab. Source-specific evidence and missing observations must be labeled; opening the UI is optional.
- **UI or incomplete-machine-contract category:** First Divergence, Astra Lens, Conversation Drift, CORE18, Desk. Link to their current locations as references; do **not** claim these are standalone external-AI APIs.
- **Experiments / specialty links:** Observatory, branch-return, success-boundary, creative lab, Signature Flow; retain accessible as supporting resources, not first-level entry.

Every tool card has fields: `WHAT`, `INPUT`, `OPERATION`, `OUTPUT`, `REQUIRES`, `EVIDENCE BOUNDARY`, `SOURCE`. Where unknown, display `Unknown / not checked`.

## 3. Migrate / keep / archive (nothing deleted)

| Existing content | New visibility | Handling |
|---|---|---|
| AI files `ai.txt`, `FLOW_WORLD_STATE.json`, `ai-entry.txt`, `ai-state.json`, `ai-tools.json` | WORLD direct links | Keep URLs byte-compatible unless a documented change requires updates |
| `tools/ab-compare.js` | WORKSHOP first tool | Keep executable and machine definition |
| `#how-to-enter` | WORLD short entry | Rewrite concise; preserve current-request priority |
| `#workbench` | WORKSHOP featured | A/B first; others reference or migrate after checking JS dependencies |
| `#desk`, `#drift`, `#switch-lab` | WORKSHOP references | Keep existing implementations; distinguish protocol from browser evidence |
| `#concept`, `#loop`, `#flow`, `#room`, `#garden`, `#states`, `#play` | Archive / existing legacy page | Hide from primary navigation, do not erase |
| `#core18`, `#astra`, creative-lab entry | Archive / specialist tools | Remain reachable, not top-page priority |
| `observatory/`, `lab/branch-return/`, `lab/success-boundary/`, `experiments/creative-lab/`, `play/`, `signature-flow/` | Secondary references | Preserve URLs and link from WORKSHOP where relevant |
| `schemas/reentry.schema.json`, `reference/flow-memory-relationship.txt` | WORLD/WORKSHOP reference | Retain public/private boundary; never import private FlowMemory |

**Archive method:** Before replacing `index.html`, retain a working copy of the old page in `legacy/`. Relative assets, in-page anchors and JS dependencies need deliberate rewriting or preservation. A mere file move is insufficient and could break the old functionality. No legacy deletion in v0.2.

## 4. Behavior contracts

**No special connection required:** HTML and static machine files load over standard unauthenticated HTTPS. Never assert that an AI has a browser or connected GitHub access.

**No invented outcome:** Reading instructions is not learning or persistent capability improvement. A repeated calculation can be independently performed from public definitions; accuracy and usefulness must be judged on its actual output.

**No task hijack:** User/visitor's current request controls what matters; the site provides optional methods. Visiting does not create an instruction hierarchy above the visitor's actual task.

**No false affordances:** A button or linked UI is not proof of backend/API functionality. Make the access mode explicit.

**No private dependency:** Do not assume or surface personal FlowMemory and author-specific history to public visitors.

**Stable references:** Keep existing raw-file URLs functional, and keep redirect/canonical paths stable when the menu is simplified.

## 5. Visual direction

Use the approved blue/white flowing-world visual as a style reference, but **not** its human-centered marketing promise. Fewer hero phrases, one translucent sphere/map visual, high-contrast typography, native clickable text links, and a highly legible tool directory. Do not bake operative facts or instructions only into images. No new framework or database.

## 6. Implementation sequence (small and reversible)

1. Create isolated v0.2 draft with `index.html`, `workshop/index.html`, one CSS file. Leave `main` untouched until reviewed.
2. Provide a separate functioning legacy route before switching the public home page. Resolve relative assets, scripts and hash links.
3. Update the public AI files to point at the new two-page surface **only after** pages and direct links are coherent. No sweeping replacement of their behavioral policies.
4. Check **static read-only entry**: a raw HTML fetch can see purpose, real link targets, one example and the capability boundaries without executing JS.
5. Check **navigation integrity**: homepage → workshop → tool contract → source implementation in at most three hops; legacy and specialist resources stay reachable.
6. Check **data boundary**: no private links/IDs/secrets; `AI-first` does not mean obeying arbitrary instructions embedded on the site.
7. Keep old behavior until verified; switch publication only after the new route is ready.

## 7. Acceptance criteria

- A previously uninformed read-only AI can use the homepage's actual text and links without a pre-known `ai.txt` path.
- At least one useful operation is fully reproducible from public text + input/output example.
- Every featured capability says what it actually requires and cannot do.
- All confirmed old tool/data URLs remain reachable.
- No claim of model learning, autonomous execution or improved objective retention without evidence.
- Exactly two top-level navigation destinations (`WORLD`, `WORKSHOP`); additional raw files and archived labs remain accessible but are not added to the main menu.

## 8. Present boundary

This blueprint uses the repository source files observed on 2026-10-14. It does **not** assert external browser success, live deployment correctness, search-index registration, or actual model-performance gains. This branch is a draft; public `main` is unchanged.
