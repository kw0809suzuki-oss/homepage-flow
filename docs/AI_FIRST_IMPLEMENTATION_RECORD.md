# Flow World — AI-first implementation record v0.3

Date: 2026-10-14  
Development branch: `ai-first-redesign-v01`  
Draft review: https://github.com/kw0809suzuki-oss/homepage-flow/pull/15  
Live `main`: **unchanged**. No production publication approved or performed.

## Implemented on branch

- `index.html` — WORLD: root-level, static HTML, no client JavaScript necessary to read the entry.
- `workshop/index.html` — WORKSHOP: text-first tool directory and access boundaries.
- `site.css`, `assets/flow-world-hero.svg` — responsive UI and decorative visual that contains no exclusive operational facts.
- `legacy/index.html` — historical multi-section homepage preserved; root resource references handled with an HTML base element, in-page anchors adjusted.
- `ai.txt`, `ai-entry.txt`, `ai-state.json`, `FLOW_WORLD_STATE.json`, `ai-tools.json` — route declarations aligned with WORLD and WORKSHOP; external verification stays explicitly false.
- `tools/first-divergence.js` — extract deterministic first observed difference into a browser-independent definition.
- `ai-tools.json` now documents four tools: A/B comparator, First Divergence, Static Handoff, Internal Switch Lab. Only the first two are standalone deterministic operations; Static Handoff requires a browser to render, and Switch Lab is a protocol, not an external API.
- `sitemap.xml` — lists the intended GitHub Pages root and WORKSHOP paths. This is not an indexing guarantee. GitHub Pages project sites are subpaths and a robots.txt located there would not act as origin-root robots policy.
- `preview/` — earlier copies retained; no production dependency on them.
- `tests/verify-ai-first.mjs` and `.github/workflows/ai-first-static.yml` — checks for local HTML link targets, two primary navigation routes, JSON contract validity, and deterministic example results.

## Grounded verification

- GitHub Actions checks for commit `7acd943456204b292c0a5b66a360f8612ef7ee5e`: both *Flow World Integrity Check* and *AI-first static integrity* completed successfully (run IDs 38532837735 and 38532837751).
- The first full branch-root static preview deployment for that commit is Vercel `dpl_GsD2ENH7B7U3Ck1Li4vBstpfZvsf`, READY.
- Latest sitemap / metadata changes occurred **after** that green test commit, and should receive fresh checks.
- Vercel project has preview SSO protection enabled. External ordinary web fetch could not open preview pages. READY therefore does **not** prove external-AI access, screenshot fidelity, JavaScript behavior or anonymous navigation.
- The user's original public GitHub Pages main branch has not been replaced.

## Unverified before production release

1. Browser screenshots of `/` and `/workshop/` from final branch at both desktop and mobile sizes.
2. Unauthenticated external HTTP response and clickable links from chosen public production host, including ordinary AI text retrieval.
3. Legacy browser behavior when served under `/legacy/`, particularly relative JS fetches and image assets.
4. Search indexing or actual discovery without being supplied a URL.
5. Any change to visitor model knowledge, autonomous capability, completion rate or long-term objective retention.

## Release boundary

Do not merge PR #15 solely because code checks and Vercel compilation pass. The user's primary objective is an AI-accessible public web entry. Keep the PR draft until public-access and browser checks justify release. Production deployment may be triggered automatically when the base branch changes.
