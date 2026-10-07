# Marketing images

These are the screenshots `marketing_v1.html` and `marketing_v1.md` reference, by file name. They were seeded from the demo's own screenshot set (`assets/demo-screenshots/`) so the brief works out of the box. Replace any of them with your own capture under the **same file name** and the brief picks it up without edits.

| File | What it shows | Where to capture it (persona → path) |
|---|---|---|
| `01-client-home.png` | Client home: progress, "Needs your action", verified records | Ingrid Vos → `/` |
| `02-engagement-workspace.png` | Engagement overview: phase rail, next action, team, level of assurance | Ingrid Vos → `/engagements/svc_nw_inv_2025` |
| `03-evidence-step.png` | Step detail: required slots, versions, rejection reason | Ingrid Vos → `/engagements/svc_nw_inv_2025/phases` |
| `04-opinion-issued.png` | Issued opinion: code, hashes, figures, level badge | Ingrid Vos → `/engagements/svc_nw_inv_2024/opinion` |
| `05-public-verification.png` | Public verification page | any → `/verify/<code>` (code from the opinion tab) |
| `06-decarb-record.png` | decarb_unit record: baseline vs project, 400,000 units | Ingrid Vos → `/records/decarb-units/dcu_nw_milk_2025` |
| `07-materiality-panel.png` | Opinion tab with the aggregation panel and inconsistency warning | Tomas Lindqvist → `/engagements/svc_nw_pcf_2025/opinion` |
| `08-withdrawn-statement.png` | Public page of a withdrawn statement | any → `/verify/<PCF 2024 code>` |
| `09-competence-check.png` | Nomination dialog with the live competence and rotation check | Helena Brandt → Atlas team nomination step → Nominate → pick a role for Jonas |
| `10-timeline.png` | Timeline with milestones, ticks and the table view toggle | Ingrid Vos → `/engagements/svc_nw_decarb_2024/timeline` |
| `11-admin-dashboard.png` | Administration dashboard with money rollups | Sam Okafor → `/admin` |
| `12-integrations-preview.png` | Integrations page: API, MCP, webhooks in preview | Ingrid Vos → `/integrations` |

Capture tips: 1440 × 900 window, light theme, a fresh tab after **Reset demo** so the seed data is clean, and crop nothing (the brief scales images to fit). To regenerate every demo screenshot in one go: `cd demo && npm run build && node scripts/screenshot.mjs ../assets/demo-screenshots`.
