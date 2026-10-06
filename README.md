# VERIFASSUR_X — digital assurance platform

VERIFASSUR_X is the client portal of a third-party assurance company (validation and verification body) in the carbon market. A client company requests validation or verification work, follows each engagement with full visibility of evidence, findings, timeline and opinions, and keeps its verified GHG inventory, product emission factors and `decarb_units` as structured, assurance-backed records.

This repository holds the product planning and, in `demo/`, a clickable front-end mock of the platform used to show investors what the product looks like.

## Phases

| Phase | What | Where |
|---|---|---|
| I — Mock platform | Static React app that looks and behaves like the real platform. Every click does what the real one would, driven by an in-browser mock backend. No persistence beyond the browser tab. | `demo/` |
| II — Real platform | Cloudflare implementation (Workers, D1, R2, Better Auth) described in the PRD. Not started. | `verifassurx/` (future) |

## Live demo

- GitHub Pages: https://rbndchsn.github.io/digital-platform/
- Cloudflare Pages: _activates once the `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repository secrets are set_

## Planning documents

- [`planning/plan_v1.md`](planning/plan_v1.md) — execution plan, operating rules, progress log
- [`planning/brainstorming.md`](planning/brainstorming.md) — analysis of a reference platform and the binding product decisions
- [`planning/0001-prd-verifassurx-platform.md`](planning/0001-prd-verifassurx-platform.md) — product requirements document
- [`planning/tasks-0001-prd-verifassurx-platform.md`](planning/tasks-0001-prd-verifassurx-platform.md) — Phase II task list

## Run the demo locally

```bash
cd demo
npm install
npm run dev
```

Node 22 and npm 10 are required.

## Licence

All rights reserved. No licence is granted for reuse of this code or content.
