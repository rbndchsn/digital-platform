# Asset brief — every graphic, clip and sound the films need

Ids are the ones used in `scenes.mjs`, the scripts and `storyboard.html`.

## 1. Generated graphics (done; regenerate with `node cards/build-cards.mjs`)

All 1920 × 1080 PNG in `cards/out/`. Fonts load from Google Fonts at render time; if the machine is offline the cards fall back to system fonts, so render once online.

| Id | File | Used in | What it is |
|---|---|---|---|
| T01 | `t01-cold-open.png` | still for M01 | Three questions on ink |
| T02 | `t02-title.png` | T2, F2 | Logo lockup, "The digital platform for sustainability assurance", scope line, "Verified in one workspace" |
| T03 | `t03-email-folders-pdfs.png` | still for M02 | "E-mail. Folders. PDFs." / "Assurance is a black box." |
| T04 | `t04-three-audiences.png` | T3, F3 | Three columns: Clients · Verifiers · Everyone downstream. Reveal one column at a time in the editor (mask or three crops). |
| T05 | `t05-two-things.png` | still for M06 | Client portal · Verified-data ledger · Verifier workflow |
| T06 | `t06-flow.png` | still for M03 | Request → Run → Decide → Keep → Prove |
| T07 | `t07-rules-in-workflow.png` | F10 | Standards on the left, enforced controls on the right |
| T08 | `t08-six-differences.png` | F11 | Six differentiators, 01–06. Reveal one at a time (six keyframes of a mask, or crop the PNG into six pieces). |
| T09 | `t09-roadmap.png` | still for M04 | Now · Next · Later |
| T10 | `t10-nothing-disappears.png` | T7, F9 | Verified · Superseded · Withdrawn chips |
| T11 | `t11-end-card.png` | still for M05 | End card. **Add the contact line** in `cards/build-cards.mjs` (search `contact · e-mail · phone`) and re-render with `node cards/build-cards.mjs t11`; do the same in `motion/render-motion.mjs` for M05. |
| T12 | `t12-proof-you-can-click.png` | F13 | 16 · 13 · 3 · 1 and the demo URL |
| CH1–CH6 | `ch1-request.png` … `ch6-accreditation-grade.png` | F5–F10 | Chapter cards with the flow bar highlighting the active verb |
| LT | `lt-*.png` (9) | first appearance of each persona | Lower-thirds, transparent, bottom-right |
| F | `f-*.png` (35) | montage clips | Feature label chips, transparent, bottom-left |
| Logo | `cards/logo.svg` | thumbnails, end card, your own slides | Teal mark + wordmark, 640 × 120 viewBox |

## 2. Motion pieces (done; regenerate with `node motion/render-motion.mjs`)

Each piece exists three ways in `motion/`: an **HTML file** you can open full-screen and screen-record (reload to replay), a **PNG sequence** in `motion/out/<id>/0001.png…` (imports into every editor, including DaVinci Resolve free), and a **WebM** in `motion/out/<id>.webm` (CapCut, Premiere, Resolve Studio). Pick whichever your editor takes; the PNG sequence is the safest.

| Id | File | Length | Used in | Motion |
|---|---|---|---|---|
| M01 | `m01-cold-open` | 9 s | T1, F1 | Three questions rise one by one (0.5 s, 2.8 s, 5.1 s); a rule draws at 6.6 s |
| M02 | `m02-email-folders-pdfs` | 6 s | T3, F3 | One word per second, then the orange line at 3.8 s |
| M03 | `m03-flow` | 6 s | T4, F4 | Five verbs pop in left to right, arrows grow, lead line at 3.4 s |
| M04 | `m04-roadmap` | 8 s | T9, F12 | Columns rise at 1 s, 3 s, 5 s; items stagger; footer at 6.8 s. Time the narration "Now… Next… Later" to the columns |
| M05 | `m05-end-card` | 8 s | T10, F13 | Logo pops, tagline, lead, URL, fictional line, contact |
| M06 | `m06-two-things` | 7 s | T4, F4 | Left card from the left, right card from the right, workflow bar rises, footer |

Changing text: edit the piece in `motion/render-motion.mjs`, run `node motion/render-motion.mjs m0X`.

## 3. Screen recordings (you record; the list is `03-shot-list.md`)

44 clips, about 9 minutes of raw material, one OBS session, 1440 × 900 browser window, light theme. Save as `clips/<id>-<two-words>.mp4` (for example `clips/C18-issuance.mp4`). The hero clips, recorded twice with a slower cursor:

- **C18 issuance** (eight steps ticking, "Opinion issued")
- **C17 refused decision** (disabled button, notice naming Marc Lefèvre)
- **C24 unit mismatch** (litres refused, kilograms accepted)
- **C20 withdrawn statement** (red banner, code still resolves)

Mouse discipline: move in straight lines, stop for a beat before every click, never circle. Hover states matter (the orange pill, the hash, the lock).

## 4. Optional AI-generated stills (you generate, if you want them)

The films are designed to work without stock imagery; the typographic cards are the intended look. If you want two or three photographic beats for the problem segment (T3, F3), generate them with any image model and put them in `images/`. Keep them desaturated and dark so they sit on the ink background. Prompts:

1. **The inbox.** "Overhead photograph of a desk at dusk, a laptop showing an overflowing e-mail inbox, printed PDF reports with sticky notes, a binder, muted teal and charcoal palette, shallow depth of field, editorial, no people, no readable text, 16:9."
2. **The binder.** "Close-up of a thick procedures binder on a shelf among others, labels blank, cool light, dust in the air, documentary style, muted palette, 16:9."
3. **The question.** "A single printed verification statement on a boardroom table, out of focus people in the background, a hand resting near it, the paper lit, everything else dim, editorial photograph, muted teal and charcoal, no readable text, 16:9."

Do not generate anything that looks like a real logo, certificate or accreditation mark. Replace these with your own photographs if you have them.

## 5. Sound (you source)

| Asset | Spec | Where |
|---|---|---|
| Narration, teaser | WAV 48 kHz 24-bit mono, one file per scene (`audio/teaser-T1.wav` …), −16 LUFS | from `05-voiceover-teaser.txt` |
| Narration, full | same, `audio/full-F1.wav` … | from `05-voiceover-full.txt` |
| Room tone | 10 s of silence from the same room and microphone, for noise reduction | `audio/room-tone.wav` |
| Music bed | one track per film, royalty-free, licence saved next to it; brief in `00-creative-brief.md` section 5 | `audio/music-*.mp3` + `.txt` licence |
| Tick (optional) | a soft UI tick for the eight issuance steps | `audio/tick.wav` |

Synthetic narration is acceptable for a first cut (ElevenLabs, Azure Neural, Play.ht). Use the same voice for both films, 0.9× speed, and listen for these words: VERIFASSUR_X ("verif-assure ex"), decarb_units ("decarb units"), ISO 14064-1 ("I-S-O fourteen-oh-six-four dash one"), misstatement, materiality.

## 6. Things you add to this folder

- `images/logo-final.svg` if the brand gets a proper logo; then replace the lockup in `cards/theme.mjs` (`logo()`) and re-render.
- `images/` photographs or generated stills (section 4).
- `clips/` the 44 recordings (section 3). Large files; they are git-ignored.
- `audio/` narration, room tone, music, licences (section 5). Git-ignored.
- Contact details on the end card (section 1, T11).
