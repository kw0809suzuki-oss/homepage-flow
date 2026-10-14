# Flow World AI-first renewal — implementation record

Date: 2026-10-14  
Branch: `ai-first-redesign-v01`  
Public site: **unchanged** (`main` not modified).

## Files created

| Path | Purpose |
|---|---|
| `docs/AI_FIRST_REDESIGN_V02.md` | Two-page design, migration map, boundary and acceptance criteria |
| `preview/index.html` | WORLD: text-first public entry for outside AIs |
| `preview/workshop/index.html` | WORKSHOP: actual definitions and compatibility limits |
| `preview/site.css` | Responsive visual system |
| `preview/assets/flow-world-hero.svg` | Decorative spherical world illustration, with no operational facts hidden in it |
| `legacy/index.html` | Source-preserving archived home page; root-relative file paths resolved using HTML base and same-page hash links rewritten |

## Repository-level evidence checked

- Preview pages contain normal HTML text and native anchors; they do not require JavaScript for the entry text.
- There are exactly **two primary navigation items** on both preview pages: WORLD and WORKSHOP.
- The machine-readable tool list on current `main` declares **three** items: `ab-comparator`, `static-handoff-play`, `internal-switch-lab`. This preview does not pretend every visible tool is a machine API.
- Shared A/B code was read: `tools/ab-compare.js`; numeric example corresponds to its definition.
- All in-page `#fragment` anchors in the two preview pages and legacy copy were checked against HTML IDs; no missing local anchors found.
- The new `preview/assets/flow-world-hero.svg`, `legacy/index.html`, and original hero/room/states image assets were confirmed to exist on the draft branch.
- Earlier repository link review confirmed core TXT/JSON contracts and old lab directories. This is **repository existence**, not a claim that the public deployment currently serves them.
- Legacy HTML retained existing content and root resource loading via `<base href="../">`. Its inline source contained literal `\\n` between some tags; the archive copy cleans that whitespace without altering functionality intentionally.

## Open boundaries (do not claim complete)

- No browser render/screenshots for the new pages. Responsive display and SVG appearance have not been visually verified.
- No external user or external AI has been measured discovering, reading, and using this draft.
- No public hosting from this branch is assumed; a GitHub source link is not a deployed preview URL.
- This draft is at `preview/`, so the links would require path adjustment before promoting the pages to repository root and `/workshop/`.
- No new machine contracts or APIs have been added. The three existing definitions remain canonical.
- Existing site functionality in `legacy/` is preserved at source level but browser execution and cross-page JS fetch behavior have not been validated.
- No search indexing or model-learning improvement is claimed.

## Before public cutover

1. Make the intended root versions by adjusting preview-relative file links; do not blindly move HTML.
2. Confirm browser rendering with JavaScript disabled and mobile viewport.
3. Validate legacy route, especially script loading and relative JSON fetches.
4. Check external unauthenticated HTTP responses for `/`, `/workshop/`, `/ai-tools.json`, and `/FLOW_WORLD_STATE.json`.
5. Update machine state metadata only after final routes are coherent; verify source freshness and make no unsupported deployment assertions.
6. Keep a reversible rollback path to old root from `legacy/`.

Current outcome: **AI-first draft, assets, and legacy preservation completed on a separate branch; publication and external-access behavior remain unverified.**
