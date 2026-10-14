# Flow World — AI-first release record

Date: 2026-10-14  
Status: **PUBLISHED**  
Pull request: https://github.com/kw0809suzuki-oss/homepage-flow/pull/15  
Merge commit: `311fd369fdcb4c3595d6c3b939f0c856e2dc9474`

## Production entry points

- GitHub Pages WORLD: https://kw0809suzuki-oss.github.io/homepage-flow/
- GitHub Pages WORKSHOP: https://kw0809suzuki-oss.github.io/homepage-flow/workshop/
- Vercel WORLD: https://homepage-flow.vercel.app/
- Vercel WORKSHOP: https://homepage-flow.vercel.app/workshop/
- Original homepage retained: https://homepage-flow.vercel.app/legacy/

## What shipped

- Root `index.html` replaced with text-first WORLD; `workshop/index.html` has the actual documented tool capabilities.
- Existing old interactive home retained in `legacy/index.html`, with relative links and paths adjusted after publication; original file remains in Git history.
- `ai.txt`, `ai-entry.txt`, `FLOW_WORLD_STATE.json`, `ai-state.json`, `ai-tools.json` reflect the AI-first routing.
- Four machine contracts are available (A/B Comparator, First Divergence, Static Handoff, Internal Switch Lab). Of these, only A/B and First Divergence are standalone deterministic operations. Other tools remain browser surfaces or protocols.
- `reference/return-to-purpose.md` describes the optional difference between a local result and completion of the original task.
- Spherical SVG hero, responsive CSS, canonical links and sitemap.
- Static entry trail / link / example tests.

## Verification facts

- Before merge, original Flow World Integrity Check and AI-first static integrity were both successful for PR head `133a2859a4e2ef9882a96b3fb785b50b517652d8`.
- After merge, Vercel production deployment for commit `311fd369fdcb4c3595d6c3b939f0c856e2dc9474` reached READY.
- An external, unauthenticated web-reading service read **new** WORLD and WORKSHOP text from both Vercel and GitHub Pages on 2026-10-14.
- The same service read `/legacy/` and `/ai-tools.json` from Vercel, including live link targets.
- A post-release observation found archive navigation links initially resolved with duplicate `legacy/legacy/` segments for an external reader. Removed the HTML `<base>` element, converted archive links to ordinary relative paths, and preserved local JavaScript data access with `legacy/script.js`. Subsequent external retrieval showed `/legacy/#...` paths, not duplicate paths.
- Follow-up Vercel production deployments reached READY. Main branch includes a CI job targeting both the historical and new AI routes.

## Not established

- Rendering fidelity in real desktop/mobile browsers; production screenshots have not been captured.
- All browser-only tools fully functioning under the archived path (automated source checks cover links; runtime interaction remains untested).
- Search indexing or spontaneous discovery of the website by an AI without being given the URL.
- Any improvement in model weights, long-term memory, goal retention, or external-AI task quality.

## Rollback

- PR #15 merge commit is recorded above; earlier `main` commit was `c7577159efdbda88097cfd5a6668ba5dfe8e8844`.
- The original multi-section site remains accessible at `/legacy/`, without needing a rollback to view it.
- No private FlowMemory content was imported into the site.

This file is a release log and evidence boundary, not proof that visiting Flow World trains or changes an AI.
