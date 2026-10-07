// Generates the scripts, shot list, teleprompter files and storyboard.html from scenes.mjs.
// Usage: node build.mjs   (run from marketing/video-marketing)
import { writeFileSync } from 'node:fs'
import { clips, cards, labels, lowerThirds, teaser, full } from './scenes.mjs'

const WPS = 130 / 60 // narration pace: 130 words per minute
const labelText = Object.fromEntries(labels)

const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`
const words = (t) => (t.trim() ? t.trim().split(/\s+/).length : 0)

function withTimes(video) {
  let t = 0
  return video.scenes.map((s) => {
    const start = t
    t += s.dur
    const visualSum = s.visual.reduce((a, v) => a + v.secs, 0)
    return { ...s, start, end: t, words: words(s.vo), budget: Math.floor(s.dur * WPS), visualSum }
  })
}

function assetLine(v) {
  const label = v.text && labelText[v.text] ? `label **${labelText[v.text]}**` : v.text
  if (clips[v.asset]) {
    const c = clips[v.asset]
    return `| ${v.asset} | ${v.secs} s | Clip · ${c.persona} · \`${c.url}\` | ${label} |`
  }
  if (cards[v.asset]) return `| ${v.asset} | ${v.secs} s | Graphic · \`${cards[v.asset].file}\` | ${label} |`
  return `| ${v.asset} | ${v.secs} s | Made in the editor | ${label} |`
}

function scriptMd(video, fileNote) {
  const scenes = withTimes(video)
  const total = scenes.at(-1).end
  const totalWords = scenes.reduce((a, s) => a + s.words, 0)
  const out = []
  out.push(`# ${video.title} — script`)
  out.push('')
  out.push(`Generated from \`scenes.mjs\` by \`node build.mjs\`; edit the source, not this file. ${fileNote}`)
  out.push('')
  out.push(`**Target length:** ${video.target} (${mmss(total)} of planned screen time). **Narration:** ${totalWords} words, which is ${mmss(totalWords / WPS)} at 130 words per minute. **Audience:** ${video.audience}`)
  out.push('')
  out.push('Legend: **ON SCREEN** the ordered assets with their seconds (clip ids are in `03-shot-list.md`, graphic ids in `04-asset-brief.md`) · **SAY** the narration · **MUSIC** · **EDIT** notes for the cut.')
  out.push('')
  out.push('| # | Scene | Start | Length | Kind | Words | Budget |')
  out.push('|---|---|---|---|---|---|---|')
  for (const s of scenes) out.push(`| ${s.id} | ${s.title} | ${mmss(s.start)} | ${s.dur} s | ${s.kind} | ${s.words} | ${s.budget}${s.words > s.budget * 1.05 ? ' ⚠' : ''} |`)
  out.push('')
  out.push('Budget = the words that fit the scene at 130 wpm with room to breathe; ⚠ means tighten the narration or lengthen the scene.')
  out.push('')
  out.push('---')
  for (const s of scenes) {
    out.push('')
    out.push(`## ${s.id} — ${s.title}  (⏱ ${mmss(s.start)}–${mmss(s.end)} · ${s.dur} s · ${s.kind})`)
    out.push('')
    out.push('**ON SCREEN**')
    out.push('')
    out.push('| Asset | Secs | Source | What the viewer sees / overlay |')
    out.push('|---|---|---|---|')
    for (const v of s.visual) out.push(assetLine(v))
    if (s.visualSum !== s.dur) out.push(`\n⚠ visuals add up to ${s.visualSum} s, scene is ${s.dur} s`)
    out.push('')
    out.push('**SAY**')
    out.push('')
    out.push(s.vo ? s.vo.split('\n').map((l) => `> ${l}`).join('\n>\n') : '> *(no narration)*')
    out.push('')
    out.push(`**MUSIC** ${s.music}`)
    out.push('')
    out.push(`**EDIT** ${s.notes}`)
  }
  out.push('')
  out.push('---')
  out.push('')
  out.push('## Lines to avoid')
  out.push('')
  out.push('- "Issues credits", "registry", "transfers", "claims": the platform verifies only.')
  out.push('- "Calculates your emissions": the client declares, the platform logs, checks and verifies.')
  out.push('- "The AI decides": the assistant is a preview and only proposes; people decide.')
  out.push('- Accreditation status the company does not hold yet; name the standards as the scope of the work.')
  out.push('- Real company or person names: everything in the demo is fictional.')
  out.push('')
  return out.join('\n')
}

function teleprompter(video) {
  const scenes = withTimes(video)
  const out = [`${video.title.toUpperCase()} — NARRATION ONLY`, 'Read at about 130 words per minute. Pause at each blank line. A line in [brackets] is a cue, not spoken.', '', '']
  for (const s of scenes) {
    out.push(`${s.id} — ${s.title.toUpperCase()}   [${mmss(s.start)} · ${s.dur} s]`)
    out.push('')
    if (!s.vo) out.push('[no narration — music only]')
    else for (const line of s.vo.split('\n')) { out.push(line); out.push('') }
    out.push('')
  }
  return out.join('\n')
}

// Recording order: grouped by persona and chapter so the demo state is right for every clip.
const order = [
  ['A · Sign-in and client home (Ingrid, chapters 1–2)', ['C01', 'C41', 'C02', 'C03', 'C09', 'C42', 'C04', 'C05']],
  ['B · Verifier triage and team (Helena, chapter 3)', ['C06', 'C07']],
  ['C · Agreement with a hash (Amina, chapter 4)', ['C08']],
  ['D · Evidence vault (Ingrid then Priya, chapter 5)', ['C10', 'C11', 'C12']],
  ['E · Findings (Pieter then Priya, chapter 6)', ['C13', 'C14']],
  ['F · Records (Ingrid, chapter 7)', ['C22', 'C23', 'C24']],
  ['G · Materiality, decision, issuance (Tomas, Helena, Marc, chapter 13) — HERO', ['C15', 'C16', 'C17', 'C18', 'C19']],
  ['H · Revision and withdrawal (chapter 14) and the public pages', ['C43', 'C20', 'C21', 'C25', 'C44']],
  ['I · Cases, competence, templates (Helena, Ingrid, chapters 15–16)', ['C28', 'C29', 'C26', 'C27', 'C39']],
  ['J · Manager override (Helena, chapter 12) — after block D', ['C30', 'C31']],
  ['K · Administration (Sam, chapter 11)', ['C32', 'C33', 'C35', 'C34']],
  ['L · The future (Ingrid then Helena, chapter 10)', ['C37', 'C38']],
  ['M · B-roll', ['C36', 'C40']],
]

function usedIn(id) {
  const t = teaser.scenes.filter((s) => s.visual.some((v) => v.asset === id)).map((s) => s.id)
  const f = full.scenes.filter((s) => s.visual.some((v) => v.asset === id)).map((s) => s.id)
  return [...t, ...f].join(', ') || '—'
}

function shotList() {
  const out = []
  out.push('# Shot list — record in this order')
  out.push('')
  out.push('Generated from `scenes.mjs`. One OBS session from a fresh **Reset demo** (`Ctrl+.` → Reset demo → type `reset`), 1440 × 900 window, light theme, presenter notes off. Blocks are ordered so the demo state is right: block J (override) must come after block D (the re-upload), block G issues the Gouda opinion that block G’s public page needs.')
  out.push('')
  out.push('Persona switch: `Ctrl+.` → click the name or the chapter. Hold every still **2 s before and 2 s after** an action. If a click goes wrong, wait 2 s, say "retake" and redo the clip. `raw` is the length to record; the edit uses 3–5 s of most clips, more where the script says.')
  out.push('')
  const allIds = new Set(Object.keys(clips))
  let total = 0
  for (const [block, ids] of order) {
    out.push(`## ${block}`)
    out.push('')
    out.push('| ✓ | Clip | Persona | Go to | Do | Must be visible | Raw | Used in |')
    out.push('|---|---|---|---|---|---|---|---|')
    for (const id of ids) {
      const c = clips[id]
      allIds.delete(id)
      total += c.raw
      const spare = usedIn(id) === '—' ? ' *(spare: not in either cut, record if time allows)*' : ''
      const opt = (id === 'C44' ? ' *(optional: needs chapter 8 played first so the 2025 decarb opinion exists)*' : '') + spare
      out.push(`| ☐ | **${id}** | ${c.persona} | \`${c.url}\` | ${c.do}${opt} | ${c.see} | ${c.raw} s | ${usedIn(id)} |`)
    }
    out.push('')
  }
  if (allIds.size) out.push(`⚠ clips not in the recording order: ${[...allIds].join(', ')}`)
  out.push(`Total raw material: about ${Math.round(total / 60)} minutes before retakes; plan 45 minutes for the session.`)
  out.push('')
  out.push('## Codes you will need')
  out.push('')
  out.push('- **PCF 2024 (withdrawn):** Ingrid → `/engagements/svc_nw_pcf_2024/opinion` → the code on the statement card.')
  out.push('- **Decarb 2024 (superseded):** Ingrid → `/engagements/svc_nw_decarb_2024/opinion` → **Statement history** → the row marked Superseded.')
  out.push('- **Gouda 2025 (issued in C18):** shown in the issuance dialog; the public tab opens from there.')
  out.push('')
  out.push('## Naming the files')
  out.push('')
  out.push('Save each clip as `clips/C18-issuance.mp4` (id, dash, two or three words). The storyboard and scripts reference the id only, so the words are for you. Keep the raw OBS recording as well.')
  out.push('')
  return out.join('\n')
}

function storyboard() {
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
  const thumb = (v) => {
    if (clips[v.asset]) return clips[v.asset].shot
    if (cards[v.asset]) return cards[v.asset].still ?? cards[v.asset].file
    return null
  }
  const video = (vid) => {
    const scenes = withTimes(vid)
    const total = scenes.at(-1).end
    const totalWords = scenes.reduce((a, s) => a + s.words, 0)
    const bar = scenes.map((s) => `<span class="seg ${s.kind}" style="flex:${s.dur}" title="${esc(s.id)} ${esc(s.title)} · ${s.dur}s"><i>${esc(s.id)}</i></span>`).join('')
    const sceneHtml = scenes.map((s) => `
<section class="scene" id="${vid.id}-${s.id}">
  <header><span class="id">${esc(s.id)}</span><h3>${esc(s.title)}</h3><span class="meta">${mmss(s.start)}–${mmss(s.end)} · ${s.dur} s · ${s.kind} · ${s.words}/${s.budget} words${s.words > s.budget * 1.05 ? ' <b class="warn">over</b>' : ''}</span></header>
  <div class="frames">${s.visual.map((v) => {
    const t = thumb(v)
    const lab = v.text && labelText[v.text] ? `<span class="chip">${esc(labelText[v.text])}</span>` : esc(v.text ?? '')
    const src = clips[v.asset] ? `${v.asset} · ${esc(clips[v.asset].persona)}` : cards[v.asset] ? `${v.asset} · graphic` : 'editor'
    return `<figure>${t ? `<img loading="lazy" src="${t}" alt="">` : '<div class="blank">made in the editor</div>'}<figcaption><b>${src}</b> · ${v.secs} s<br>${lab}</figcaption></figure>`
  }).join('')}</div>
  <div class="vo">${s.vo ? s.vo.split('\n').map((l) => `<p>${esc(l)}</p>`).join('') : '<p class="none">no narration</p>'}</div>
  <p class="note"><b>Music</b> ${esc(s.music)}</p>
  <p class="note"><b>Edit</b> ${esc(s.notes)}</p>
</section>`).join('')
    return `
<article class="video" id="${vid.id}">
  <h2>${esc(vid.title)} <small>${esc(vid.target)} · planned ${mmss(total)} · ${totalWords} words (${mmss(totalWords / WPS)} at 130 wpm)</small></h2>
  <p class="aud">${esc(vid.audience)}</p>
  <div class="bar">${bar}</div>
  ${sceneHtml}
</article>`
  }
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>VERIFASSUR_X video storyboard</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Source+Sans+3:wght@400;600&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
:root{--ink:#0b1f1e;--muted:#4f5f5e;--ground:#f4f7f7;--surface:#fff;--line:#dbe3e3;--teal:#0f766e;--teal-soft:#d8efec;--orange:#9a3412;--orange-soft:#fde8dc;--blue:#1d4ed8;--blue-soft:#dbeafe}
*{box-sizing:border-box}body{margin:0;background:var(--ground);color:var(--ink);font:16px/1.5 "Source Sans 3",Segoe UI,sans-serif}
header.top{background:var(--ink);color:#e6f0ef;padding:28px 32px}header.top h1{font:600 34px/1.1 Fraunces,Georgia,serif;margin:0 0 6px}header.top p{margin:0;color:#a3b5b4;max-width:70ch}
header.top a{color:#2dd4bf}
main{max-width:1500px;margin:0 auto;padding:24px 32px 80px}
.video{margin:28px 0 60px}.video h2{font:600 28px/1.2 Fraunces,Georgia,serif;margin:0 0 4px}.video h2 small{display:block;font:600 14px/1.4 "Source Sans 3";color:var(--muted);letter-spacing:.02em}
.aud{color:var(--muted);margin:0 0 14px}
.bar{display:flex;gap:2px;height:30px;margin:0 0 24px;border-radius:6px;overflow:hidden}
.seg{display:flex;align-items:center;justify-content:center;background:var(--teal-soft);color:var(--ink);font:600 11px "IBM Plex Mono",monospace;min-width:0;overflow:hidden}
.seg.montage{background:var(--orange-soft)}.seg.card{background:var(--ink);color:#e6f0ef}.seg i{font-style:normal;white-space:nowrap}
.scene{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:18px 20px;margin:0 0 16px;box-shadow:0 1px 2px rgba(11,31,30,.06),0 8px 24px rgba(11,31,30,.05)}
.scene header{display:flex;align-items:baseline;gap:14px;flex-wrap:wrap;margin-bottom:12px}.scene .id{font:600 13px "IBM Plex Mono",monospace;background:var(--ink);color:#e6f0ef;padding:2px 8px;border-radius:6px}
.scene h3{font:600 20px/1.2 Fraunces,Georgia,serif;margin:0}.scene .meta{color:var(--muted);font-size:14px}.warn{color:#b91c1c}
.frames{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px;margin:0 0 12px}
figure{margin:0;border:1px solid var(--line);border-radius:8px;overflow:hidden;background:var(--ground)}figure img{display:block;width:100%;aspect-ratio:16/10;object-fit:cover;object-position:top}
.blank{aspect-ratio:16/10;display:flex;align-items:center;justify-content:center;background:var(--ink);color:#a3b5b4;font-style:italic}
figcaption{padding:8px 10px;font-size:13px;line-height:1.35;color:var(--muted)}figcaption b{color:var(--ink)}
.chip{display:inline-block;margin-top:4px;background:var(--ink);color:#e6f0ef;padding:1px 8px;border-radius:999px;font-size:12px}
.vo{border-left:4px solid var(--teal);background:var(--teal-soft);padding:10px 16px;border-radius:0 8px 8px 0;margin:0 0 10px}.vo p{margin:0 0 6px;font-size:17px}.vo .none{color:var(--muted);font-style:italic}
.note{margin:4px 0;color:var(--muted);font-size:14px}.note b{color:var(--ink)}
nav{display:flex;gap:12px;flex-wrap:wrap;margin:18px 0 0}nav a{color:var(--teal);font-weight:600}
@media (prefers-color-scheme:dark){:root{--ink:#e6f0ef;--muted:#a3b5b4;--ground:#0b1514;--surface:#122020;--line:#274140;--teal:#2dd4bf;--teal-soft:#11312e;--orange-soft:#3a2113}.seg.card{background:#2dd4bf;color:#04201d}.scene .id{background:#2dd4bf;color:#04201d}.chip{background:#2dd4bf;color:#04201d}.blank{background:#1a2c2b}}
</style></head><body>
<header class="top"><h1>VERIFASSUR_X — video storyboard</h1><p>Two cuts from one recording session. Thumbnails are stand-ins (existing screenshots and generated cards); the real frames come from your screen recordings listed in <a href="03-shot-list.md">03-shot-list.md</a>. Green segments are long narrative beats, orange are 3–5 s feature montages, dark are full-screen graphics.</p>
<nav><a href="#teaser">Teaser</a><a href="#full">Full film</a><a href="00-creative-brief.md">Creative brief</a><a href="04-asset-brief.md">Asset brief</a><a href="06-production-guide.md">Production guide</a></nav></header>
<main>${video(teaser)}${video(full)}</main>
</body></html>`
}

writeFileSync('01-teaser-script.md', scriptMd(teaser, 'Companion: `05-voiceover-teaser.txt`.'))
writeFileSync('02-full-script.md', scriptMd(full, 'Companion: `05-voiceover-full.txt`.'))
writeFileSync('03-shot-list.md', shotList())
writeFileSync('05-voiceover-teaser.txt', teleprompter(teaser))
writeFileSync('05-voiceover-full.txt', teleprompter(full))
writeFileSync('storyboard.html', storyboard())

// Console report
for (const v of [teaser, full]) {
  const scenes = withTimes(v)
  const total = scenes.at(-1).end
  const w = scenes.reduce((a, s) => a + s.words, 0)
  console.log(`${v.id}: ${mmss(total)} planned, ${w} words (${mmss(w / WPS)} at 130 wpm)`)
  for (const s of scenes) {
    const flags = []
    if (s.words > s.budget * 1.05) flags.push(`over budget ${s.words}/${s.budget}`)
    if (s.visualSum !== s.dur) flags.push(`visuals ${s.visualSum}s vs ${s.dur}s`)
    if (flags.length) console.log(`  ${s.id} ${s.title}: ${flags.join('; ')}`)
  }
}
const unusedClips = Object.keys(clips).filter((id) => usedIn(id) === '—')
if (unusedClips.length) console.log('clips recorded but unused:', unusedClips.join(', '))
const unusedLabels = labels.map(([id]) => id).filter((id) => ![...teaser.scenes, ...full.scenes].some((s) => s.visual.some((v) => v.text === id)))
if (unusedLabels.length) console.log('labels unused:', unusedLabels.join(', '))
console.log(`lower-thirds: ${lowerThirds.length}, labels: ${labels.length}, clips: ${Object.keys(clips).length}, cards: ${Object.keys(cards).length}`)
