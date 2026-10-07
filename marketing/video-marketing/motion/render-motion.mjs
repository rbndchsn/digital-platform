// Builds the six motion graphics as self-contained HTML (open in a browser to preview or screen-record),
// then renders each one frame by frame with the demo's Playwright and encodes a WebM with Playwright's ffmpeg.
// Usage (from marketing/video-marketing):
//   node motion/render-motion.mjs            → motion/*.html + motion/out/<id>/0001.png… + motion/out/<id>.webm
//   node motion/render-motion.mjs m04        → only the pieces whose id contains "m04"
//   node motion/render-motion.mjs --html     → write the HTML files only (no rendering)
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { spawn } from 'node:child_process'
import { homedir } from 'node:os'
import { chromium } from '../../../demo/node_modules/playwright/index.mjs'
import { baseCss, logo, tokens } from '../cards/theme.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const out = resolve(here, 'out')
mkdirSync(out, { recursive: true })
const args = process.argv.slice(2)
const htmlOnly = args.includes('--html')
const filter = args.find((a) => !a.startsWith('--')) ?? ''
const FPS = 30

// Playwright ships a minimal ffmpeg (MJPEG in, VP8/WebM out) next to its browsers; find it on Windows, macOS or Linux.
// PLAYWRIGHT_BROWSERS_PATH is honoured. Set FFMPEG=/path/to/ffmpeg (for example a Homebrew build) to use another binary.
function findFfmpeg() {
  if (process.env.FFMPEG) return process.env.FFMPEG
  const bases = [
    process.env.PLAYWRIGHT_BROWSERS_PATH,
    resolve(homedir(), 'AppData/Local/ms-playwright'), // Windows
    resolve(homedir(), 'Library/Caches/ms-playwright'), // macOS
    resolve(homedir(), '.cache/ms-playwright'), // Linux
  ].filter(Boolean)
  for (const base of bases) {
    if (!existsSync(base)) continue
    const dir = readdirSync(base).find((d) => d.startsWith('ffmpeg'))
    if (!dir) continue
    const exe = readdirSync(resolve(base, dir)).find((f) => f.startsWith('ffmpeg'))
    if (exe) return resolve(base, dir, exe)
  }
  return null
}

const motionCss = `
.a{opacity:0;animation:rise .9s cubic-bezier(.2,.7,.2,1) both;animation-delay:var(--d,0s)}
.a.fast{animation-duration:.6s}
.a.pop{animation-name:pop}
.a.left{animation-name:fromLeft}.a.right{animation-name:fromRight}
.a.fade{animation-name:fade}
@keyframes rise{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:none}}
@keyframes fade{from{opacity:0}to{opacity:1}}
@keyframes pop{from{opacity:0;transform:scale(.86)}to{opacity:1;transform:none}}
@keyframes fromLeft{from{opacity:0;transform:translateX(-70px)}to{opacity:1;transform:none}}
@keyframes fromRight{from{opacity:0;transform:translateX(70px)}to{opacity:1;transform:none}}
@keyframes grow{from{transform:scaleX(0)}to{transform:scaleX(1)}}
.ruleA{position:absolute;left:140px;right:140px;bottom:96px;height:2px;background:linear-gradient(90deg,${tokens.teal},transparent 70%);transform-origin:left;transform:scaleX(0);animation:grow 1.4s cubic-bezier(.2,.7,.2,1) both;animation-delay:var(--d,0s)}
.flow .arrow{transform-origin:left;transform:scaleX(0);animation:grow .5s ease-out both;animation-delay:var(--d,0s)}
`
const html = (body, extraCss = '') => `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>motion</title><style>${baseCss}${motionCss}${extraCss}</style></head><body>${body}</body></html>`
const d = (s) => `style="--d:${s}s"`

const pieces = {
  'm01-cold-open': { dur: 9, html: html(`<div class="frame"><div class="grain"></div>
    <div class="display h2 a" ${d(0.5)} style="max-width:1400px">Who verified this number?</div>
    <div class="display h2 muted a" ${d(2.8)} style="margin-top:36px">To what level of assurance?</div>
    <div class="display h2 teal a" ${d(5.1)} style="margin-top:36px">Can anyone check?</div>
    <div class="ruleA" ${d(6.6)}></div></div>`) },

  'm02-email-folders-pdfs': { dur: 6, html: html(`<div class="frame"><div class="grain"></div>
    <div class="display h1"><span class="a fast" ${d(0.3)} style="display:inline-block">E-mail.</span> <span class="a fast muted" ${d(1.3)} style="display:inline-block">Folders.</span> <span class="a fast muted" ${d(2.3)} style="display:inline-block;opacity:.6">PDFs.</span></div>
    <div class="display h3 orange a" ${d(3.8)} style="margin-top:60px">Assurance is a black box.</div>
    <div class="ruleA" ${d(4.2)}></div></div>`) },

  'm03-flow': { dur: 6, html: html(`<div class="frame center"><div class="grain"></div>
    <div class="eyebrow a fade" ${d(0.1)} style="margin-bottom:60px">One workspace, five verbs</div>
    <div class="flow">${['Request', 'Run', 'Decide', 'Keep', 'Prove'].map((w, i) => `${i ? `<div class="arrow" ${d(0.3 + i * 0.55 - 0.25)}></div>` : ''}<div class="step a pop fast" ${d(0.3 + i * 0.55)}><div class="w">${w}</div></div>`).join('')}</div>
    <div class="lead a" ${d(3.4)} style="margin-top:70px">Every obligation, document, decision and verified number has an owner, a status, a timestamp and a link to its evidence.</div></div>`) },

  'm04-roadmap': { dur: 8, html: html(`<div class="frame" style="justify-content:flex-start;padding-top:90px"><div class="grain"></div>
    <div class="eyebrow a fade" ${d(0.1)}>How we stay ahead</div>
    <div class="display h3 a" ${d(0.2)} style="margin:14px 0 34px">Now · Next · Later</div>
    <div class="cols three">
      <div class="card a" ${d(1.0)} style="border-color:${tokens.teal}"><div class="chip teal">Now · Release 1</div><ul class="clean" style="margin-top:24px">${['Request, run, decide, keep, prove', 'Evidence vault with hashes', 'Materiality and involved set', 'Verified-data ledger', 'Public verification pages', 'Competence, rotation, cases', 'Administration and audit'].map((t, i) => `<li class="a fast fade" ${d(1.5 + i * 0.12)}>${t}</li>`).join('')}</ul></div>
      <div class="card a" ${d(3.0)}><div class="chip amber">Next · previews today</div><ul class="clean" style="margin-top:24px">${['Spreadsheet import', 'REST API, per-client keys', 'MCP server for software and agents', 'AI evidence assistant (proposes, never decides)', 'Legal e-signature', 'CSRD / ESRS E1 and ISO exports', 'Registry links, portfolios'].map((t, i) => `<li class="a fast fade" ${d(3.5 + i * 0.12)}>${t}</li>`).join('')}</ul></div>
      <div class="card a" ${d(5.0)}><div class="chip">Later · Release 3+</div><ul class="clean" style="margin-top:24px">${['Continuous assurance on monthly data streams', 'dMRV connectors', 'Verifiable credentials for opinions', 'Digital product passport export', 'Agent-to-agent verification', 'Multi-verifier recognition'].map((t, i) => `<li class="a fast fade" ${d(5.5 + i * 0.12)}>${t}</li>`).join('')}</ul></div>
    </div>
    <div class="foot a fade" ${d(6.8)} style="bottom:60px;font-size:26px"><span>Every form is backed by a published JSON schema the API accepts unchanged.</span><span class="teal">Switching a capability on is a flag, not a rewrite.</span></div>
    </div>`, 'ul.clean li{font-size:28px;margin:6px 0}') },

  'm05-end-card': { dur: 8, html: html(`<div class="frame center"><div class="grain"></div>
    <div class="a pop" ${d(0.3)}>${logo(1.4)}</div>
    <div class="display h3 a" ${d(1.5)} style="margin-top:80px;max-width:1500px">Your digital platform for now and the future</div>
    <div class="lead a" ${d(2.3)} style="margin-top:22px;max-width:1500px">GHG inventories, product footprints and value-chain decarbonisation, verified in one workspace.</div>
    <div class="mono teal a" ${d(3.3)} style="margin-top:70px;font-size:40px">rbndchsn.github.io/digital-platform</div>
    <div class="muted a fade" ${d(4.3)} style="margin-top:18px;font-size:28px">Demonstration with fictional organisations, people and figures.</div>
    <div class="foot a fade" ${d(4.6)}><span>VERIFASSUR Assurance S.A.</span><span>contact · e-mail · phone</span></div>
    </div>`) },

  'm06-two-things': { dur: 7, html: html(`<div class="frame" style="justify-content:flex-start;padding-top:96px"><div class="grain"></div>
    <div class="eyebrow a fade" ${d(0.1)}>What it is</div>
    <div class="display h3 a" ${d(0.2)} style="margin:14px 0 36px">Two things in one product</div>
    <div class="cols two">
      <div class="card a left" ${d(1.0)} style="border-color:${tokens.teal}"><div class="display h4">A client portal</div><p class="muted" style="margin-top:12px;font-size:28px">Request, follow and archive the independent verification of a GHG inventory, product carbon footprints, value-chain decarbonisation (<span class="mono">decarb_units</span>) and carbon projects. One next action, always.</p></div>
      <div class="card a right" ${d(2.2)} style="border-color:${tokens.teal}"><div class="display h4">A verified-data ledger</div><p class="muted" style="margin-top:12px;font-size:28px">Every opinion writes its verified figures back as records with a level of assurance, a statement reference and a history. Next year starts from this year.</p></div>
    </div>
    <div class="card a" ${d(3.8)} style="margin-top:28px;background:${tokens.tealSoft};border-color:${tokens.teal};display:flex;align-items:center;gap:40px;padding:32px 48px"><div class="display h4 teal" style="white-space:nowrap">Verifier workflow</div><p style="font-size:28px;color:${tokens.text}">Impartiality and scope approvals · team nomination with conflict-of-interest declarations, competence and rotation checks · independent review · a decision taken outside the involved set · an immutable audit trail.</p></div>
    <div class="foot a fade" ${d(5.2)} style="bottom:64px;font-size:26px"><span>VERIFASSUR_X verifies. It never issues, transfers or claims carbon units, and never computes a client’s emissions.</span><span>The platform shows; people decide.</span></div>
    </div>`) },
}

// Write the HTML files (self-contained; double-click to preview, reload to replay).
const index = []
for (const [id, p] of Object.entries(pieces)) {
  const file = resolve(here, `${id}.html`)
  writeFileSync(file, p.html)
  index.push(`<li><a href="${id}.html">${id}</a> · ${p.dur} s</li>`)
}
writeFileSync(resolve(here, 'index.html'), `<!doctype html><meta charset="utf-8"><title>Motion pieces</title><style>body{font:18px/1.6 "Source Sans 3",Segoe UI,sans-serif;background:#0b1f1e;color:#e6f0ef;padding:40px}a{color:#2dd4bf}</style><h1>VERIFASSUR_X motion pieces</h1><p>Open one, press F11 for full screen, reload to replay. Rendered files are in <code>out/</code>.</p><ul>${index.join('')}</ul>`)
if (htmlOnly) { console.log('HTML written'); process.exit(0) }

const ffmpeg = findFfmpeg()
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })
const pg = await ctx.newPage()

for (const [id, p] of Object.entries(pieces)) {
  if (filter && !id.includes(filter)) continue
  const frames = resolve(out, id)
  mkdirSync(frames, { recursive: true })
  await pg.goto(pathToFileURL(resolve(here, `${id}.html`)).href, { waitUntil: 'networkidle' })
  await pg.evaluate(() => document.fonts.ready)
  await pg.evaluate(() => document.getAnimations().forEach((a) => a.pause()))
  const total = p.dur * FPS
  // The bundled ffmpeg has no PNG decoder but reads an MJPEG stream on stdin (that is how Playwright records video),
  // so every frame is saved as PNG (lossless sequence) and piped as a high-quality JPEG for the WebM.
  let enc = null
  let encDone = Promise.resolve(-1)
  if (ffmpeg) {
    enc = spawn(ffmpeg, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(FPS), '-i', 'pipe:0', '-c:v', 'libvpx', '-b:v', '12M', '-qmin', '0', '-qmax', '18', '-auto-alt-ref', '0', '-pix_fmt', 'yuv420p', resolve(out, `${id}.webm`)], { stdio: ['pipe', 'inherit', 'inherit'] })
    encDone = new Promise((res) => enc.on('close', res))
  }
  for (let f = 0; f < total; f++) {
    await pg.evaluate((ms) => document.getAnimations().forEach((a) => { a.pause(); a.currentTime = ms }), (f / FPS) * 1000)
    await pg.screenshot({ path: resolve(frames, `${String(f + 1).padStart(4, '0')}.png`), type: 'png' })
    if (enc) {
      const jpg = await pg.screenshot({ type: 'jpeg', quality: 95 })
      if (!enc.stdin.write(jpg)) await new Promise((res) => enc.stdin.once('drain', res))
    }
  }
  let note = '(no ffmpeg found; PNG sequence only)'
  if (enc) {
    enc.stdin.end()
    const code = await encDone
    note = code === 0 ? `+ ${id}.webm` : '(ffmpeg failed; PNG sequence only)'
  }
  console.log(`${id}: ${total} frames ${note}`)
}
await browser.close()
