# Video marketing kit v2 — teaser (about 3:40) and full film (about 10:00)

Everything needed to make two professional product films of VERIFASSUR_X from the live demo, with the graphics already rendered.

## Start here

0. New here? Follow **`how_to_create_vid_v2_mac.docx`** (macOS, Word; supersedes `how_to_create_vid_v1.md`): set-up, scratch-voice timing lock, recording, the dynamic edit recipe for DaVinci Resolve, captions, export. Mac helper scripts are in `mac/`.
1. Open **`storyboard.html`** in a browser: both films scene by scene, with thumbnails, timing, narration and edit notes.
2. Read **`00-creative-brief.md`**: the idea, the structure, the visual and sound language, what is done and what you do.
3. Record the clips following **`03-shot-list.md`** (one session, 44 clips, about 9 minutes of raw material).
4. Edit with **`06-production-guide.md`**; narrate from **`05-voiceover-teaser.txt`** and **`05-voiceover-full.txt`**.

## Files

| File | What it is |
|---|---|
| `storyboard.html` | Visual storyboard of both films (generated) |
| `00-creative-brief.md` | Concept, audiences, structure, visual language, sound, tone rules |
| `01-teaser-script.md` | Teaser, scene by scene: on screen, narration, music, edit notes (generated) |
| `02-full-script.md` | Full film, same format (generated) |
| `03-shot-list.md` | The 44 screen recordings in recording order, with persona, path, clicks and what must be visible (generated) |
| `04-asset-brief.md` | Every graphic, motion piece, clip, optional image and sound: what exists, what you add |
| `05-voiceover-teaser.txt`, `05-voiceover-full.txt` | Narration only, teleprompter format (generated) |
| `06-production-guide.md` | OBS settings, recording discipline, narration, the edit recipe, export, legal |
| `scenes.mjs` | **The single source** for both films: clips, cards, labels, scenes, narration. Edit this, then `node build.mjs` |
| `build.mjs` | Regenerates the scripts, shot list, teleprompters and storyboard from `scenes.mjs`, and checks pacing |
| `cards/` | `build-cards.mjs` + `theme.mjs` render 18 full-screen cards, 9 lower-thirds, 35 label chips and the `o-frame-ink` product frame to `cards/out/`; `logo.svg` |
| `motion/` | `render-motion.mjs` writes six HTML animations and renders them to PNG sequences and WebM in `motion/out/` |
| `mac/` | macOS helpers: `setup-mac.sh`, `chrome-window.sh` (1440 × 900 guest window), `to-prores.sh` (motion → ProRes for Resolve), `scratch-vo.mjs` (timing voice with `say`), `process-vo.sh` (narration to −16 LUFS) |
| `clips/`, `audio/`, `images/` | Yours: recordings, narration and music, photographs or generated stills (git-ignored except the READMEs) |
| `v1-7min/` | The earlier single 7-minute script and kit, kept for reference |

## Regenerate

```powershell
cd marketing\video-marketing
node build.mjs                      # scripts, shot list, teleprompters, storyboard
node cards\build-cards.mjs          # all cards and overlays (needs network once for the fonts)
node cards\build-cards.mjs t11      # one card, by id fragment
node motion\render-motion.mjs       # six motion pieces, about 4 minutes
node motion\render-motion.mjs m05   # one piece
```

Rendering uses the demo's Playwright (`demo/node_modules`), so run `cd demo && npm install` once if it is missing.

## Two films, one session

| | Teaser | Full film |
|---|---|---|
| Length | about 3:40 | about 10:00 |
| Shape | cold open → title → problem → what it is → four montages → roadmap → close | cold open → title → problem → what it is → five chapters (Request, Run, Decide, Keep, Prove) → accreditation-grade → differentiators → future → proof and close |
| Clips used | 17 of the 44 | 42 of the 44 |
| Narration | 306 words | about 1,200 words |

Brand: ink `#0b1f1e`, teal `#2dd4bf` / `#0f766e`, Fraunces + Source Sans 3 + IBM Plex Mono, as in `marketing_v1.html`.
