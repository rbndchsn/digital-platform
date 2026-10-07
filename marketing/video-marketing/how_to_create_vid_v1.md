# How to create the VERIFASSUR_X videos — v1 walkthrough

This is the one page to follow. It explains how the kit works and what you do with each file, in order. Everything is in `marketing/video-marketing/`.

## How the kit works

The kit has three layers.

1. **One source of truth: `scenes.mjs`.** It lists the 44 screen clips to record, the 18 graphics, the 9 lower-thirds, the 35 feature labels, and every scene of both films with its timing, narration, music and edit notes. When you want to change a line of narration or the length of a scene, you change it here and run `node build.mjs`. The generated files (scripts, shot list, teleprompters, storyboard) are rebuilt from it; never edit those by hand.
2. **Rendered graphics.** `cards/build-cards.mjs` turns HTML templates into 1920 × 1080 PNGs (title cards, chapter cards, transparent overlays). `motion/render-motion.mjs` turns six short HTML animations into PNG sequences and WebM clips. Both use the demo's Playwright (a headless Chrome) and need the internet once for the Google Fonts.
3. **Your recordings and sound.** The product footage comes from your screen recording of the live demo, following the shot list. Narration and music are yours too. These go into `clips/`, `audio/` and `images/` (git-ignored).

The edit then assembles: your clips + the rendered cards and motion + overlays + narration + music, scene by scene, following the script.

```
scenes.mjs ──node build.mjs──▶ 01-teaser-script.md, 02-full-script.md, 03-shot-list.md,
                               05-voiceover-*.txt, storyboard.html
cards/build-cards.mjs ────────▶ cards/out/*.png   (cards, lower-thirds, labels)
motion/render-motion.mjs ─────▶ motion/*.html, motion/out/<id>/0001.png…, motion/out/<id>.webm
you ──────────────────────────▶ clips/*.mp4, audio/*.wav, audio/music-*.mp3
editor (Resolve or CapCut) ───▶ verifassurx-teaser-v2.mp4, verifassurx-full-v2.mp4
```

## Step 0 — Read (30 minutes)

1. Open `storyboard.html` in a browser. Scroll both films once. You now know the shape: slow intro, fast montages, slow close.
2. Read `00-creative-brief.md`. It is the "why" behind every choice; you will make better calls in the edit for having read it.
3. Skim `01-teaser-script.md`. You will come back to it with the editor open.

## Step 1 — Check the rendered graphics (10 minutes)

Open `cards/out/` in a file browser and look at the PNGs. Open `motion/index.html` and click each piece; press F11 for full screen, reload to replay.

If anything needs changing (wording, the contact line on the end card):

```powershell
cd marketing\video-marketing
# edit cards/build-cards.mjs (static cards) or motion/render-motion.mjs (animations)
node cards\build-cards.mjs t11        # re-render one card by id fragment
node motion\render-motion.mjs m05     # re-render one motion piece (about 40 s)
```

The end card currently says `contact · e-mail · phone`. Replace it in both files (search for that text) before the final export.

## Step 2 — Record the clips (about 45 minutes, one session)

Follow `03-shot-list.md` top to bottom. The order matters: it keeps the demo's state right (the override clip must come after the re-upload clip; the public-page clip must come right after the issuance clip).

Set-up, from `06-production-guide.md` section 1–2:

- Chrome or Edge guest window, 1440 × 900, zoom 100 %, light theme, bookmarks bar hidden.
- Live demo: https://rbndchsn.github.io/digital-platform/ → `Ctrl+.` → **Reset demo** → type `reset` → close the panel.
- OBS Studio: **window capture** of the browser, canvas 1920 × 1080, 30 fps, H.264 CQP/CRF 18, system audio muted, MKV then remux to MP4.
- Optional but recommended: place the browser window on an ink `#0b1f1e` colour source in OBS, scaled to 1720 px wide. Then every clip already looks like the final frame.

Discipline:

- Start recording, wait 2 s, perform the clip, hold the end state 2 s, stop. One file per clip.
- Stop the mouse for a full second on anything the narration names (the orange pill, the hash, the disabled button).
- If a click goes wrong, wait 2 s, say "retake", redo the clip.
- Record C18 (the issuance, eight steps ticking) twice, the second time with a slower cursor. It is the hero of both films.

Save as `clips/<id>-<two-words>.mp4`, for example `clips/C18-issuance.mp4`. Tick the ☐ boxes in the shot list as you go.

Two clips are spare (C29, C44): record them only if you have time.

## Step 3 — Narration (1 hour)

Record **after** the picture is locked (step 5), watching the cut. It is far easier than clicking and reading at once. If you prefer a synthetic voice for the first cut, do it now from the text files.

- Text: `05-voiceover-teaser.txt` and `05-voiceover-full.txt`. One block per scene. Lines in [brackets] are cues, not spoken.
- Pace: about 130 words per minute. The scripts show the word budget per scene; if you run long, slow the picture rather than speed the voice.
- Files: one WAV per scene, `audio/teaser-T1.wav` … `audio/full-F13.wav`, plus `audio/room-tone.wav` (10 s of silence from the same room).
- Processing: noise reduction, high-pass 80 Hz, light compression, normalise to −16 LUFS, peaks under −1 dB.
- Synthetic voice: same voice for both films, 0.9× speed. Listen for VERIFASSUR_X, decarb_units, ISO 14064-1, misstatement, materiality; regenerate any line that is mispronounced.

## Step 4 — Music (15 minutes)

One bed per film from a royalty-free library. Brief: minimal electronic, warm, no vocals, 90–100 bpm, a clear pulse for the montages, a melodic resolve for the ending. Save the track and its licence in `audio/`.

## Step 5 — Edit the teaser first (half a day)

Use DaVinci Resolve (free) or CapCut. Follow `06-production-guide.md` section 5; here is the short version.

Timeline 1920 × 1080, 30 fps. Tracks from the bottom:

| Track | Content | Source |
|---|---|---|
| V1 | Ink background, a solid `#0b1f1e` | made in the editor |
| V2 | Product footage | `clips/` |
| V3 | Full-screen cards and motion pieces | `cards/out/t*.png`, `cards/out/ch*.png`, `motion/out/` |
| V4 | Feature label chips | `cards/out/f-*.png` |
| V5 | Lower-thirds | `cards/out/lt-*.png` |
| A1 | Narration | `audio/` |
| A2 | Music | `audio/` |

Order of work:

1. **Narration first.** Lay the scene WAVs on A1 in script order with 0.8 s gaps. This sets every scene's real length.
2. **Cards and motion.** Drop the graphics on V3 at their scene starts, as listed in the script's ON SCREEN tables. For motion pieces, import the PNG sequence (Resolve: tick "image sequence" in the media pool) or the WebM (CapCut, Premiere).
3. **Footage.** Place each clip under the narration phrase that names it. Montage clips: keep the 3–6 s that contain the action, hard cuts.
4. **Movement.** Keyframe a 103 → 108 % push-in on every montage clip. Add a 110 % zoom over 1.2 s on the one element the narration names (list in the creative brief, section 4).
5. **Overlays.** The `f-*.png` chip for each montage clip on V4 for the clip's full length. The `lt-*.png` lower-third on V5 for 2.5 s on a persona's first appearance. They are full-frame transparent PNGs: no positioning needed.
6. **Reveals.** T04 (three columns) and T08 (six lines) are revealed in time with the narration using a rectangular mask or by cropping the PNG.
7. **Music.** In after the cold open's silence. −26 dB under narration, −18 dB under cards without narration. Lower it under the issuance clip.
8. **Captions.** Auto-transcribe, correct the product terms, burn in.
9. **Length check.** Teaser under 4:00. Trim montage clips first, never the issuance.

Which card or clip goes where is spelled out, scene by scene, in `01-teaser-script.md` (ON SCREEN table, then SAY, MUSIC, EDIT).

## Step 6 — Edit the full film (one day)

Same method, same settings, following `02-full-script.md`. Reuse the teaser's cold open and title as they are. Chapter cards (`ch1`–`ch6`) sit on V3 for 3 s before each montage with a 0.3 s dip to ink. Keep the full film under 10:30. Export captions as a sidecar `.srt`.

## Step 7 — Export and publish

| Cut | File | Settings |
|---|---|---|
| Teaser | `verifassurx-teaser-v2.mp4` | 1920 × 1080, H.264, 12 Mbps, AAC 192 kbps, captions burned in |
| Teaser social | `verifassurx-teaser-v2-4x5.mp4` | 1080 × 1350 re-frame, captions burned in |
| Full film | `verifassurx-full-v2.mp4` + `.srt` | 1920 × 1080, H.264, 12 Mbps, AAC 192 kbps |

Thumbnail: the issuance moment on ink with "Sustainability assurance, verified in one workspace" in Fraunces, 1280 × 720.

Video description: state that every organisation, person and figure is fictional, and link the live demo.

## Changing things later

| You want to | Do this |
|---|---|
| Rewrite a line of narration, or change a scene's length | Edit `scenes.mjs` → `node build.mjs` → re-read the console: it warns if narration is too long for a scene or if the visuals do not add up to the scene length |
| Add or swap a clip | Add it to `clips` in `scenes.mjs`, reference its id in a scene's `visual`, add it to the recording `order` in `build.mjs` → `node build.mjs` |
| Change a card's text or add the contact line | Edit `cards/build-cards.mjs` → `node cards\build-cards.mjs <id>` |
| Change an animation | Edit `motion/render-motion.mjs` → `node motion\render-motion.mjs <id>` |
| Add a lower-third or label | Add to `lowerThirds` or `labels` in `scenes.mjs` → `node cards\build-cards.mjs lt` or `f-` |
| Use a real logo | Replace `logo()` in `cards/theme.mjs` and re-render everything (`node cards\build-cards.mjs` and `node motion\render-motion.mjs`) |
| The demo changed | Re-record the affected clips only; the storyline test in `demo/e2e/storyline.spec.ts` tells you whether the shot list still works |

## Prerequisites

- Node 22 (already installed). The renderers import Playwright from `demo/node_modules`; if that folder is missing, run `cd demo && npm install` once.
- Internet access the first time you render (Google Fonts). Without it the cards fall back to system fonts.
- OBS Studio (free), DaVinci Resolve (free) or CapCut, a microphone.

## Checklist

- [ ] Read storyboard and creative brief
- [ ] Contact line on the end card, cards and motion re-rendered
- [ ] 44 clips recorded and named
- [ ] Narration recorded or generated, processed
- [ ] Music chosen, licence saved
- [ ] Teaser cut, captions, under 4:00, exported
- [ ] Full film cut, `.srt`, under 10:30, exported
- [ ] Thumbnail and description with the fictional-data line
