# Production checklist

## Before you record

- [ ] Open https://rbndchsn.github.io/digital-platform/ in Chrome or Edge, a fresh profile or guest window (no extensions, no bookmarks bar: `Ctrl+Shift+B`).
- [ ] Press `Ctrl+.` → **Reset demo** → type `reset`. Close the panel. Presenter notes **off**.
- [ ] Window size 1440 × 900 (the screenshots and tests use it; everything fits without scrolling surprises). On Windows, set the browser zoom to 100 % and display scaling to 100 % for the recording monitor, or record at 125 % scaling and crop consistently.
- [ ] Light theme for the main cut; dark mode only for the B-roll.
- [ ] Hide the Windows taskbar (auto-hide) or record the browser window only.
- [ ] Mouse: large cursor off, pointer speed medium; move slowly and stop before clicking.
- [ ] Read `shot-list.md` once end to end and note the three statement codes it asks for.
- [ ] Open `teleprompter.txt` on a second screen or a tablet.
- [ ] Rehearse scene 4 twice: it is the longest sequence of clicks and the heart of the video.

## Recording settings

| Setting | Value |
|---|---|
| Tool | OBS Studio (free) or Windows `Win+Alt+R`; OBS preferred for window capture and a separate audio track |
| Capture | Window capture of the browser, not the full display |
| Canvas and output | 1920 × 1080 (the 1440 × 900 window is scaled up 4:3 inside a 16:9 frame with a dark surround, or record the window at 1920 × 1200 and crop) |
| Frame rate | 30 fps (60 fps if the machine can; the issuance animation benefits) |
| Encoder | H.264, CRF 18 or 20 000 kbps; MKV while recording, remux to MP4 after |
| Audio | 48 kHz; narration on its own track; system audio muted |
| Microphone | A USB condenser or a headset mic 10–15 cm from the mouth, pop filter, quiet room, soft furnishings; record a 10-second room-tone sample for noise reduction |
| Narration | Record it **after** the screen capture, scene by scene, while watching the footage; it is much easier than clicking and reading at once |

## During

- [ ] Start recording, wait 3 seconds, then begin shot 1.
- [ ] Hold every still for 3 seconds before and after an action.
- [ ] If a click goes wrong, do not stop: wait 2 seconds, say "retake" (it marks the audio track), and redo the shot from its row in the shot list.
- [ ] Persona switches through `Ctrl+.`: keep them; they cut to 0.3-second transitions in post.
- [ ] After shot 9 (issuance), immediately do shot 10 (public page) in the new tab, then come back.
- [ ] Capture the B-roll at the end of the session.

## After: edit

- [ ] Assemble in DaVinci Resolve (free) or CapCut: scenes in the order of `video-script.md`.
- [ ] Trim dead time between clicks to about 0.6 seconds; speed up long scrolls 1.5×.
- [ ] Add a subtle zoom (105–110 %) on: the orange pill (scene 2), the greyed materiality item (scene 4), the disabled Manager decision button and its notice (scene 4), the red withdrawn banner (scene 5), the unit mismatch (scene 6), the "Blocked" line (scene 7).
- [ ] Lower-third labels when a persona changes: name and role, two seconds, bottom left ("Tomas Lindqvist · Independent reviewer").
- [ ] Captions: auto-generate, then correct the product terms (`decarb_units`, ISO 14064-1, VERIFASSUR_X, involved set). Burn in for social cuts; sidecar `.srt` for the website.
- [ ] Music: a quiet, neutral bed at −26 dB under narration, nothing under the problem statement in scene 1; fade in at scene 2.
- [ ] Narration levels at −16 LUFS integrated (web), peaks under −1 dB.
- [ ] End card 8 seconds: logo, the line "The digital platform for sustainability assurance: GHG inventories, product footprints and value-chain decarbonisation, verified in one workspace.", the demo URL, contact details.
- [ ] Title card for scene 1 ("E-mail. Folders. PDFs."): three words, one per second, on the brief's ink background `#0b1f1e` in the Fraunces typeface used by the brief.

## After: export

| Cut | Length | Format | Where |
|---|---|---|---|
| Full | about 7 min | 1920 × 1080, H.264 MP4, 10–12 Mbps, AAC 192 kbps; `.srt` sidecar | Website, YouTube (unlisted for client meetings), investor deck link |
| Short | 2 min | same, burned-in captions | LinkedIn, sales e-mail |
| Teaser | 30 s | 1920 × 1080 and a 1080 × 1350 (4:5) re-frame, burned-in captions, no narration or a single line | Social, e-mail signature link |

- [ ] Thumbnail: `marketingimages/07-materiality-panel.png` or the issuance moment, with the headline "Sustainability assurance, verified in one workspace" over the brief's ink colour; 1280 × 720.
- [ ] File names: `verifassurx-full-v1.mp4`, `verifassurx-short-v1.mp4`, `verifassurx-teaser-v1.mp4`; keep the project file and the raw recording.

## Legal and accuracy

- Every organisation, person and figure in the demo is fictional; say so in the video description and on the end card ("Demonstration with fictional data").
- Do not describe the product as issuing, transferring or retiring carbon units, or as calculating a client's emissions.
- Standards may be named (ISO 14064-1, ISO 14067, ISO 14064-2, ISO/IEC 17029, ISO 14065, ISO 14066, VCS, Gold Standard) as the scope of the work; do not claim accreditation status the company does not hold yet.
- Previews (API, MCP, AI assistant, e-signature, exports, registry links) are future capabilities; present them as planned, as the script does.
- Re-record if the demo changes: the storyline test in `demo/e2e/storyline.spec.ts` mirrors the clicks of this script, so if the test passes the script still works.

## Assets checklist

- [ ] Logo in SVG and PNG (light and dark) — add to this folder as `logo.svg`, `logo-dark.svg`.
- [ ] Brand colours: teal `#0f766e`, deep teal `#115e59`, ink `#0b1f1e`, ground `#f4f7f7`, orange "needs you" `#9a3412`.
- [ ] Fonts: Fraunces (display), Source Sans 3 (text), IBM Plex Mono (codes) — all free on Google Fonts.
- [ ] Stills: `../marketingimages/` (twelve screens, light; dark variants in `assets/demo-screenshots/dark-*.png`).
- [ ] Contact line and the demo URL for the end card.
