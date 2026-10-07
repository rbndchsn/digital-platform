// Renders every static graphic to cards/out/*.png (1920 × 1080) with the demo's Playwright.
// Usage (from marketing/video-marketing):  node cards/build-cards.mjs [filter]
// Needs network once for Google Fonts (Fraunces, Source Sans 3, IBM Plex Mono); falls back to system fonts otherwise.
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '../../../demo/node_modules/playwright/index.mjs'
import { page, logo, tokens } from './theme.mjs'
import { lowerThirds, labels } from '../scenes.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const out = resolve(here, 'out')
mkdirSync(out, { recursive: true })
const filter = process.argv[2] ?? ''

const URL = 'rbndchsn.github.io/digital-platform'
const flow = (on = 0) => `<div class="flow">${['Request', 'Run', 'Decide', 'Keep', 'Prove'].map((w, i) => `${i ? '<div class="arrow"></div>' : ''}<div class="step ${on === i + 1 ? 'on' : ''}"><div class="w">${w}</div></div>`).join('')}</div>`

const cards = {
  't01-cold-open': page(`<div class="frame"><div class="grain"></div>
    <div class="display h2" style="max-width:1400px">Who verified this number?</div>
    <div class="display h2 muted" style="margin-top:36px">To what level of assurance?</div>
    <div class="display h2 teal" style="margin-top:36px">Can anyone check?</div>
    <div class="rule"></div></div>`),

  't02-title': page(`<div class="frame center"><div class="grain"></div>
    ${logo(1.6)}
    <div class="display h3" style="margin-top:110px;max-width:1500px">The digital platform for sustainability assurance</div>
    <div class="lead" style="margin-top:28px">GHG inventories · product carbon footprints · value-chain decarbonisation · carbon projects</div>
    <div class="eyebrow" style="margin-top:70px">Verified in one workspace</div>
    </div>`),

  't03-email-folders-pdfs': page(`<div class="frame"><div class="grain"></div>
    <div class="display h1">E-mail. <span class="muted">Folders.</span> <span class="muted" style="opacity:.6">PDFs.</span></div>
    <div class="display h3 orange" style="margin-top:60px">Assurance is a black box.</div>
    <div class="rule"></div></div>`),

  't04-three-audiences': page(`<div class="frame"><div class="grain"></div>
    <div class="eyebrow">Why it is needed</div>
    <div class="display h3" style="margin:18px 0 56px">Today, three audiences are left guessing</div>
    <div class="cols three">
      <div class="card"><div class="display h4 teal">Clients</div><p class="muted" style="margin:14px 0 18px;font-size:28px">Assurance is a black box</p><ul class="clean"><li>Which document is missing?</li><li>Which finding is blocking?</li><li>When does the statement arrive?</li><li>A PDF re-typed into next year</li></ul></div>
      <div class="card"><div class="display h4 teal">Verifiers</div><p class="muted" style="margin:14px 0 18px;font-size:28px">Accreditation is a paper exercise</p><ul class="clean"><li>Impartiality, competence, review</li><li>Proven after the fact</li><li>Checklists and filing</li><li>A procedure can be skipped</li></ul></div>
      <div class="card"><div class="display h4 teal">Everyone downstream</div><p class="muted" style="margin:14px 0 18px;font-size:28px">A claim is only as good as its proof</p><ul class="clean"><li>Who verified this?</li><li>To what level?</li><li>Is it still current?</li><li>An inbox cannot answer</li></ul></div>
    </div></div>`),

  't05-two-things': page(`<div class="frame" style="justify-content:flex-start;padding-top:96px"><div class="grain"></div>
    <div class="eyebrow">What it is</div>
    <div class="display h3" style="margin:14px 0 36px">Two things in one product</div>
    <div class="cols two">
      <div class="card" style="border-color:${tokens.teal}"><div class="display h4">A client portal</div><p class="muted" style="margin-top:12px;font-size:28px">Request, follow and archive the independent verification of a GHG inventory, product carbon footprints, value-chain decarbonisation (<span class="mono">decarb_units</span>) and carbon projects. One next action, always.</p></div>
      <div class="card" style="border-color:${tokens.teal}"><div class="display h4">A verified-data ledger</div><p class="muted" style="margin-top:12px;font-size:28px">Every opinion writes its verified figures back as records with a level of assurance, a statement reference and a history. Next year starts from this year.</p></div>
    </div>
    <div class="card" style="margin-top:28px;background:${tokens.tealSoft};border-color:${tokens.teal};display:flex;align-items:center;gap:40px;padding:32px 48px"><div class="display h4 teal" style="white-space:nowrap">Verifier workflow</div><p style="font-size:28px;color:${tokens.text}">Impartiality and scope approvals · team nomination with conflict-of-interest declarations, competence and rotation checks · independent review · a decision taken outside the involved set · an immutable audit trail.</p></div>
    <div class="foot" style="bottom:64px;font-size:26px"><span>VERIFASSUR_X verifies. It never issues, transfers or claims carbon units, and never computes a client’s emissions.</span><span>The platform shows; people decide.</span></div>
    </div>`),

  't06-flow': page(`<div class="frame center"><div class="grain"></div>
    <div class="eyebrow" style="margin-bottom:60px">One workspace, five verbs</div>${flow(0)}
    <div class="lead" style="margin-top:70px">Every obligation, document, decision and verified number has an owner, a status, a timestamp and a link to its evidence.</div></div>`),

  't07-rules-in-workflow': page(`<div class="frame"><div class="grain"></div>
    <div class="eyebrow">Accreditation-grade by construction</div>
    <div class="display h3" style="margin:18px 0 48px">Rules in the workflow, not in a binder</div>
    <div class="cols two" style="grid-template-columns:1fr 1.3fr">
      <div class="card"><div class="eyebrow" style="font-size:22px">The standards ask for</div><ul class="clean" style="margin-top:18px"><li>Impartiality</li><li>Competence</li><li>Independent review</li><li>Separation of decision</li><li>Materiality judgement</li><li>Rotation</li><li>Complaints and appeals</li></ul><p class="mono muted" style="margin-top:22px;font-size:24px">ISO/IEC 17029 · ISO 14065 · ISO 14066</p></div>
      <div class="card" style="border-color:${tokens.teal}"><div class="eyebrow" style="font-size:22px">The workflow enforces</div><ul class="clean" style="margin-top:18px"><li>COI declaration before a service opens for you</li><li>Competence and rotation checked at nomination; IR qualification is a hard block</li><li>Iteration goes to an independent reviewer, then to a manager outside the involved set</li><li>Non-overridable gates as template data; a refused attempt is logged</li><li>Misstatements aggregated against materiality; a warning must be acknowledged</li><li>Handlers for complaints never in the involved set</li></ul></div>
    </div></div>`),

  't08-six-differences': page(`<div class="frame"><div class="grain"></div>
    <div class="eyebrow">What makes it different</div>
    <div class="cols two" style="margin-top:40px;gap:28px 60px">
      ${[['Client-first', 'what you must do, what you got, what it cost'], ['Numbers, not PDFs', 'verified figures become records with a level and a history'], ['Rules in the workflow', 'not in a binder: enforced by the system, visible on screen'], ['Conflicts shown, not hidden', 'a manager who cannot decide sees why, and who can'], ['Nothing disappears', 'revisions and withdrawals keep the page and re-mark the records'], ['The roadmap is in the product', 'previews with "I’m interested" measure demand before we build']]
        .map(([h, p], i) => `<div style="display:flex;gap:28px;align-items:flex-start"><div class="mono teal" style="font-size:44px;line-height:1;padding-top:10px">0${i + 1}</div><div><div class="display h4">${h}</div><p class="muted" style="font-size:30px;margin-top:6px">${p}</p></div></div>`).join('')}
    </div></div>`),

  't09-roadmap': page(`<div class="frame" style="justify-content:flex-start;padding-top:90px"><div class="grain"></div>
    <div class="eyebrow">How we stay ahead</div>
    <div class="display h3" style="margin:14px 0 34px">Now · Next · Later</div>
    <div class="cols three">
      <div class="card" style="border-color:${tokens.teal}"><div class="chip teal">Now · Release 1</div><ul class="clean" style="margin-top:24px"><li>Request, run, decide, keep, prove</li><li>Evidence vault with hashes</li><li>Materiality and involved set</li><li>Verified-data ledger</li><li>Public verification pages</li><li>Competence, rotation, cases</li><li>Administration and audit</li></ul></div>
      <div class="card"><div class="chip amber">Next · previews today</div><ul class="clean" style="margin-top:24px"><li>Spreadsheet import</li><li>REST API, per-client keys</li><li>MCP server for software and agents</li><li>AI evidence assistant (proposes, never decides)</li><li>Legal e-signature</li><li>CSRD / ESRS E1 and ISO exports</li><li>Registry links, portfolios</li></ul></div>
      <div class="card"><div class="chip">Later · Release 3+</div><ul class="clean" style="margin-top:24px"><li>Continuous assurance on monthly data streams</li><li>dMRV connectors</li><li>Verifiable credentials for opinions</li><li>Digital product passport export</li><li>Agent-to-agent verification</li><li>Multi-verifier recognition</li></ul></div>
    </div>
    <div class="foot" style="bottom:60px;font-size:26px"><span>Every form is backed by a published JSON schema the API accepts unchanged.</span><span class="teal">Switching a capability on is a flag, not a rewrite.</span></div>
    </div>`),

  't10-nothing-disappears': page(`<div class="frame center"><div class="grain"></div>
    <div class="display h2" style="margin-bottom:70px">Nothing disappears.</div>
    <div class="cols three" style="width:1640px;text-align:left">
      <div class="card"><div class="chip green">Verified</div><p class="muted" style="margin-top:22px;font-size:29px">Opinion type, level of assurance, materiality, verified figures, document hashes, signatories, QR code.</p></div>
      <div class="card"><div class="chip amber">Superseded</div><p class="muted" style="margin-top:22px;font-size:29px">Amber banner. The page stays, with a link to the replacement statement. Records point to the new code; the history keeps both.</p></div>
      <div class="card"><div class="chip red">Withdrawn</div><p class="muted" style="margin-top:22px;font-size:29px">Red banner with the reason category. Figures and hashes hidden. The code still resolves; the records are marked "assurance withdrawn".</p></div>
    </div></div>`),

  't11-end-card': page(`<div class="frame center"><div class="grain"></div>
    ${logo(1.4)}
    <div class="display h3" style="margin-top:80px;max-width:1500px">Your digital platform for now and the future</div>
    <div class="lead" style="margin-top:22px;max-width:1500px">GHG inventories, product footprints and value-chain decarbonisation, verified in one workspace.</div>
    <div class="mono teal" style="margin-top:70px;font-size:40px">${URL}</div>
    <div class="muted" style="margin-top:18px;font-size:28px">Demonstration with fictional organisations, people and figures.</div>
    <div class="foot"><span>VERIFASSUR Assurance S.A.</span><span>contact · e-mail · phone</span></div>
    </div>`),

  't12-proof-you-can-click': page(`<div class="frame center"><div class="grain"></div>
    <div class="eyebrow">Proof you can click</div>
    <div class="cols" style="grid-template-columns:repeat(4,1fr);width:1640px;margin-top:50px">
      ${[['16', 'chapters'], ['13', 'personas'], ['3', 'client companies'], ['1', 'verification body']].map(([n, w]) => `<div class="card"><div class="display teal" style="font-size:150px;line-height:1">${n}</div><div class="lead" style="margin-top:10px">${w}</div></div>`).join('')}
    </div>
    <div class="mono teal" style="margin-top:70px;font-size:44px">${URL}</div>
    <div class="muted" style="margin-top:14px;font-size:28px">Nothing leaves the browser. Press Ctrl + . to switch persona or jump to a chapter.</div>
    </div>`),
}

const chapters = [
  ['ch1-request', 1, 'Request', 'A need becomes a structured engagement'],
  ['ch2-run', 2, 'Run', 'Three phases, one next action, evidence with a hash'],
  ['ch3-decide', 3, 'Decide', 'Materiality, independent review, a decision outside the involved set'],
  ['ch4-keep', 4, 'Keep', 'Verified numbers as records, not PDFs'],
  ['ch5-prove', 5, 'Prove', 'A public page that tells the truth about time'],
  ['ch6-accreditation-grade', 6, 'Accreditation-grade by construction', 'Rules in the workflow, not in a binder'],
]
for (const [id, n, word, sub] of chapters) {
  cards[id] = page(`<div class="frame"><div class="grain"></div>
    <div class="mono teal" style="font-size:40px;letter-spacing:.2em">CHAPTER ${n}</div>
    <div class="display ${word.length > 10 ? 'h2' : 'h1'}" style="margin-top:16px">${word}</div>
    <div class="lead" style="margin-top:26px">${sub}</div>
    <div style="position:absolute;left:140px;right:140px;bottom:120px;transform:scale(.62);transform-origin:left bottom">${n <= 5 ? flow(n) : flow(0)}</div>
    </div>`)
}

// Transparent overlays: lower-thirds (bottom-right) and feature labels (bottom-left), full 1920 × 1080 canvas.
const overlays = {}
for (const lt of lowerThirds) overlays[lt.id] = page(`<div class="frame"><div class="lt"><div class="bar"></div><div class="body"><div class="name">${lt.name}</div><div class="role">${lt.role}</div></div></div></div>`, { transparent: true })
for (const [id, text] of labels) overlays[id] = page(`<div class="frame"><div class="label">${text}</div></div>`, { transparent: true })
// Product frame (o-frame-ink): an ink surround with a 1720 × 1075 rounded window (40 px) and a soft shadow. Put it on the
// track directly above the footage, scale the footage to 1720 px wide, and every clip gets rounded corners and a shadow
// without any mask work in the editor. A push-in on the footage stays inside the window.
overlays['o-frame-ink'] = page(`<div class="frame" style="padding:0;align-items:center;justify-content:center"><div style="width:1720px;height:1075px;border-radius:40px;box-shadow:0 30px 90px rgba(0,0,0,.55), 0 0 0 3000px ${tokens.ink}"></div></div>`, { transparent: true })

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })
const pg = await ctx.newPage()
let n = 0
async function render(id, html, transparent) {
  if (filter && !id.includes(filter)) return
  await pg.setContent(html, { waitUntil: 'networkidle' })
  await pg.evaluate(() => document.fonts.ready)
  await pg.waitForTimeout(150)
  await pg.screenshot({ path: resolve(out, `${id}.png`), omitBackground: transparent, type: 'png' })
  n++
}
for (const [id, html] of Object.entries(cards)) await render(id, html, false)
for (const [id, html] of Object.entries(overlays)) await render(id, html, true)
await browser.close()
writeFileSync(resolve(here, 'logo.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 120" width="640" height="120"><rect x="4" y="14" width="92" height="92" rx="24" fill="${tokens.tealDeep}"/><path d="M27 62l18 18 36-40" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/><text x="124" y="84" font-family="Source Sans 3, Segoe UI, sans-serif" font-weight="700" font-size="64" letter-spacing="1" fill="${tokens.text}">VERIFASSUR<tspan fill="${tokens.teal}">_X</tspan></text></svg>`)
console.log(`rendered ${n} graphics to cards/out (plus cards/logo.svg)`)
