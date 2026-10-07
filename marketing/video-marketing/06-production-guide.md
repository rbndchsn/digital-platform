# Production guide — record, edit, export

Order of work: **record** the clips (one session) → **lock the picture** for the teaser first (it is short and reuses the full film's structure) → **narrate** while watching the cut → **mix** → **export** → repeat the edit for the full film with the teaser's settings.

## 1. Before you record

- [ ] Open https://rbndchsn.github.io/digital-platform/ in Chrome or Edge, a guest window (no extensions, no bookmarks bar: `Ctrl+Shift+B`).
- [ ] `Ctrl+.` → **Reset demo** → type `reset`. Close the panel. Presenter notes **off**.
- [ ] Window 1440 × 900. Browser zoom 100 %. Display scaling 100 % on the recording monitor (or record at 125 % and crop consistently).
- [ ] Light theme. Taskbar auto-hide. Mouse pointer medium speed, no pointer trails, no "large cursor".
- [ ] Read `03-shot-list.md` once end to end. Write the two statement codes it asks for on a sticky note.
- [ ] Rehearse C18 (issuance) and C26 (nomination dialog) twice each.

## 2. Recording settings

| Setting | Value |
|---|---|
| Tool | OBS Studio (free). Windows `Win+Alt+R` works but gives you no window capture and no separate audio track. |
| Capture | **Window capture** of the browser, not the display. |
| Canvas and output | 1920 × 1080. Place the 1440 × 900 window centred on an ink `#0b1f1e` colour source, scaled to 1720 px wide, so every clip already looks like the final frame. Add a 40 px rounded-corner mask (OBS: filter → Image Mask/Blend with a rounded rectangle) and a soft drop shadow if you like; otherwise do it once in the editor. |
| Frame rate | 30 fps (60 if the machine copes; the issuance ticks look smoother). |
| Encoder | H.264, CQP 18 (NVENC) or CRF 18 (x264), MKV while recording, remux to MP4 after (File → Remux). |
| Audio | System audio **muted**. No microphone during screen capture. |
| Hotkeys | Start/stop recording on a key you can reach without moving the mouse. |

Record each clip as its own file (start, clip, stop) or one long file with 3 s pauses and the word "retake" spoken aloud when needed; both work, one file per clip is faster to find later. Name files `clips/<id>-<two-words>.mp4`.

## 3. During

- [ ] Start recording, wait 2 s, perform the clip, hold the end state 2 s, stop.
- [ ] Hover states count: stop on the orange pill, the hash, the lock, the disabled button, for a full second.
- [ ] If a click goes wrong, do not stop: wait 2 s, say "retake", redo from the start of the clip.
- [ ] Persona switches through `Ctrl+.` are cut out in post; no need to hide them.
- [ ] Do blocks A to M in the order of the shot list. Block J (override) after block D (re-upload). Block G issues the Gouda opinion; do the public-page clip C19 straight after C18.
- [ ] Capture the B-roll (block M) last.

## 4. Narration

Record **after** the picture is locked, scene by scene, watching the cut: it is much easier than clicking and reading at once, and the pauses land where the picture needs them.

- Microphone 10–15 cm from the mouth, pop filter, quiet room with soft furnishings. Record 10 s of room tone first.
- One file per scene named by scene id (`audio/teaser-T3.wav`). Read from `05-voiceover-*.txt`; a line in brackets is a cue, not spoken.
- Pace about 130 words per minute. The scripts show the word budget per scene; if you run long, slow the picture, do not speed the voice.
- Processing: noise reduction from the room tone, high-pass 80 Hz, light compression (3:1, −18 dB threshold), de-esser, normalise to −16 LUFS integrated, peaks under −1 dB.
- Synthetic voice for a first cut: fine. Same voice for both films, 0.9× speed, re-generate any line with a mispronounced product term (`00-creative-brief.md` section 5).

## 5. Edit recipe (DaVinci Resolve free, or CapCut)

Timeline 1920 × 1080, 30 fps. Tracks from the bottom: **V1** ink background (a 1920 × 1080 solid `#0b1f1e`), **V2** product footage, **V3** full-screen cards and motion pieces, **V4** feature labels, **V5** lower-thirds, **A1** narration, **A2** music, **A3** ticks.

1. **Lay the narration first** (A1), one clip per scene, in script order, with 0.8 s between scenes. This sets the length of every scene; the scene durations in the scripts are targets, the voice is the truth.
2. **Drop the cards and motion** (V3) at their scene starts: M01 at 0:00, T02 after the cold open, and so on.
3. **Place the footage** (V2) under the narration phrases that name it. Montage clips: cut the 3–6 s window that contains the action, hard cuts, cut on the beat once the music is in.
4. **Push-in on every montage clip**: keyframe scale 103 % → 108 % over the clip's length, ease in and out. Long clips in the slow segments: 100 % → 104 % over their full length.
5. **Zooms** on the one element the narration names (list in `00-creative-brief.md` section 4): 110 % over 1.2 s, hold, back out over 0.8 s or cut.
6. **Labels** (V4): the `f-*.png` chip for the clip, in for the full clip, 0.2 s fade in and out.
7. **Lower-thirds** (V5): the `lt-*.png` on a persona's first appearance in each film, 2.5 s, 0.3 s fade in and out.
8. **Reveals on cards**: T04 three columns, T08 six lines, M04 columns are already animated. Reveal with a rectangular mask keyframed in time with the narration, or crop the PNG into pieces.
9. **Transitions**: hard cuts in montages; 0.5 s cross-dissolve between a card and footage in slow segments; 0.3 s dip to colour (ink) before each chapter card.
10. **Music** (A2): in at the first cut after the cold open's silence. −26 dB under narration, −18 dB under music-only cards. Duck the percussion (or lower 6 dB) under C18. Resolve the tail over the end card.
11. **Ticks** (A3, optional): one soft tick per issuance step, −24 dB.
12. **Captions**: auto-transcribe, correct the product terms, burn in for the teaser, export `.srt` for the full film.
13. **Trim**: the teaser must not exceed 4:00; the full film not 10:30. Trim montage clips first, never the issuance.

Thumbnail (1280 × 720): the issuance moment or `marketingimages/07-materiality-panel.png` on ink with the line "Sustainability assurance, verified in one workspace" in Fraunces.

## 6. Export

| Cut | File | Format |
|---|---|---|
| Teaser | `verifassurx-teaser-v2.mp4` | 1920 × 1080, H.264 High, 12 Mbps, AAC 192 kbps, burned-in captions |
| Teaser, social | `verifassurx-teaser-v2-4x5.mp4` | 1080 × 1350 re-frame (footage scaled to width, labels re-placed), burned-in captions |
| Full film | `verifassurx-full-v2.mp4` + `.srt` | 1920 × 1080, H.264 High, 12 Mbps, AAC 192 kbps |
| Stills | from `cards/out/` | for the deck, the website, e-mail signatures |

Keep the project file, the raw recordings and the narration; the demo changes and you will re-cut.

## 7. Legal and accuracy

- Every organisation, person and figure is fictional: say so in the video description and on the end card (it is on the card already).
- Never describe the product as issuing, transferring or retiring carbon units, or as calculating a client's emissions.
- Standards can be named as the scope of the work; do not claim an accreditation status the company does not hold yet.
- Previews (API, MCP, AI assistant, e-signature, exports, registry links, continuous assurance) are future capabilities; the scripts present them as planned.
- Music and voice: keep the licence file next to the asset.
- If the demo changes, re-record the affected clips. The storyline test in `demo/e2e/storyline.spec.ts` mirrors the clicks of the chapters; if it passes, the shot list still works.

## 8. If you would rather not record by hand

Playwright can drive the demo and record video (`browser.newContext({ recordVideo })`), the way `demo/scripts/screenshot.mjs` captures stills. The result has no visible cursor and instant interactions, which reads as robotic for the montage; it is a fair fallback for static-page clips (C02, C09, C22, C32) and for re-recording after a demo change. Ask for the script if you want it.
