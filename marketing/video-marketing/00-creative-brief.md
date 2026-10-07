# Creative brief — VERIFASSUR_X product films

Two films from one recording session. Same visual language, same narrator, same music family. The teaser is a self-contained short; the full film is the teaser's structure expanded into chapters.

| | Teaser | Full film |
|---|---|---|
| Length | about 3:40 | about 10:00 |
| Script | `01-teaser-script.md` | `02-full-script.md` |
| Narration | `05-voiceover-teaser.txt` (306 words) | `05-voiceover-full.txt` (about 1,200 words) |
| Where it goes | LinkedIn, sales e-mail, first contact, event screens | Website, investor and client meetings, partner onboarding |
| Promise to the viewer | "In three minutes you will know what this is and why it is different." | "In ten minutes you will have seen every part of it work." |

## 1. The one idea

**A claim is only as good as its proof.** Everything VERIFASSUR_X does ends in something a stranger can check: a code, a status, a hash, a name, a time. The films open on that proof (the public verification page) before explaining anything, so the viewer sees the destination first and the product as the way to get there.

Supporting lines, in the order the films use them:

1. **Assurance is a black box.** E-mail, folders, PDFs. (the problem)
2. **One workspace. Two things in one product.** Client portal + verified-data ledger, with the verifier workflow underneath. (what it is)
3. **Request · Run · Decide · Keep · Prove.** Five verbs that structure every feature. (what it does)
4. **Rules in the workflow, not in a binder.** Accreditation-grade by construction. (why it is credible)
5. **Nothing disappears.** Revisions and withdrawals keep the page and re-mark the records. (why it is trustworthy)
6. **The roadmap is in the product.** Now, next, later; a flag, not a rewrite. (why it stays ahead)
7. **The platform shows; people decide.** (the guardrail, said once in each film)

## 2. Audiences and what each must hear

| Audience | Must hear | Where it lands |
|---|---|---|
| Sustainability and carbon leads (clients) | One next action; verified numbers reused next year; renewal pre-filled | Chapters Request, Run, Keep |
| Verification bodies and their managers | Involved set, materiality, competence and rotation, overrides with a reason, audit log | Chapter Decide and the accreditation-grade segment |
| Investors | A complete R1, previews with measured demand, a technical path (schemas, flags) to API, MCP, continuous assurance | What it is, Future, Close |
| Buyers, programmes, regulators | The public page, withdrawn and superseded statements | Cold open, chapter Prove |

## 3. Structure and rhythm

Your instruction was: longer segments at the start, then short 3–5 second clips of functionality. The films follow a **slow-fast-slow** shape.

- **Slow (0:00 to about 1:35 teaser / 2:15 full).** Cold open, title, problem, what it is. Single ideas, generous holds, typographic cards, two or three product screens that move slowly (scroll, push-in). Narration carries the weight.
- **Fast (the montages).** Clips of 3–6 seconds, one label chip each, hard cuts on the beat, a 103 → 108 % push-in on every clip so nothing is static. The narration becomes short declarative phrases, one per clip. Chapter cards (3 s) separate the montages in the full film.
- **Slow again (differentiators, future, close).** Cards and motion pieces, narration returns to full sentences, music resolves.

Two moments are deliberately longer inside the montages and should not be trimmed: the **issuance** (eight steps ticking, the hero of both films) and the **refused decision** (the disabled button with the notice naming who can decide). They are the two things nobody else shows.

## 4. Visual language

- **Canvas:** 1920 × 1080, 30 fps (60 if the machine can; the issuance animation benefits).
- **Product footage:** the live demo at 1440 × 900, light theme, placed on the ink background with a soft shadow, scaled to about 1720 px wide with a 40 px rounded corner mask. The surround makes the app look like a product shot rather than a screen recording. Dark-mode footage only as B-roll.
- **Graphics:** ink `#0b1f1e` background, teal `#2dd4bf` accent, text `#e6f0ef`, muted `#a3b5b4`. Display type Fraunces (serif, 600), text Source Sans 3, codes IBM Plex Mono. The generated cards in `cards/out/` already follow this; keep anything you make in the editor consistent with them.
- **Overlays:** feature labels bottom-left (`cards/out/f-*.png`), lower-thirds bottom-right (`cards/out/lt-*.png`). Both are full-frame transparent PNGs: drop them on a track above the footage, no positioning needed. Label in for the full clip; lower-third in for 2.5 s on a persona's first appearance.
- **Zooms:** a 110 % zoom over 1.2 s, ease-in-out, on the one element the narration names (the orange pill, the greyed checklist item, the disabled button, the red banner, the unit mismatch, the "Blocked" line, the "Platform administrator only" badge).
- **Transitions:** hard cuts inside montages; 0.5 s dissolves between cards and footage in the slow segments; a 0.3 s dip to ink before every chapter card.
- **Captions:** burned in for social (teaser), sidecar `.srt` for the website (full). Correct the product terms by hand: `decarb_units`, VERIFASSUR_X, ISO 14064-1, involved set.

## 5. Sound

- **Narration:** one voice, calm and concrete, about 130 words per minute, recorded after the picture lock while watching the cut. −16 LUFS integrated, peaks under −1 dB. If you use a synthetic voice, pick a neutral European-English voice, slow it to 0.9×, and re-record any line where a product term is mispronounced.
- **Music:** one bed per film from a royalty-free library (Epidemic Sound, Artlist, Uppbeat). Brief: "minimal electronic, warm, no vocals, 90–100 bpm, a clear pulse for the montage, a melodic resolve for the ending". Silence for the first four seconds of the cold open. Bed at −26 dB under narration, −18 dB under cards without narration. Drop the percussion for the issuance moment.
- **Sound effects:** none on the product footage except, optionally, a soft tick on each issuance step (eight ticks, −24 dB). No whooshes.

## 6. Tone rules for the narration

- Say what is on screen, never more. Every claim in the scripts is something the demo shows.
- Short sentences. Verbs. "The button is not hidden. It is disabled, with the reason."
- Never: "issues credits", "registry", "calculates your emissions", "the AI decides". The platform verifies; people decide; the assistant proposes.
- Name the standards as the scope of the work (ISO 14064-1, ISO 14067, ISO/IEC 17029, ISO 14065, ISO 14066, VCS, Gold Standard); do not claim an accreditation status the company does not hold yet.
- Every organisation, person and figure is fictional; say so on the end card and in the video description.

## 7. What you will do, what is already done

| Done (in this folder) | You do |
|---|---|
| Scripts, narration, storyboard, shot list | Record the 44 clips from the demo (one session, about 45 minutes with retakes) following `03-shot-list.md` |
| 18 full-screen cards and 6 motion pieces, rendered | Record or generate the narration from `05-voiceover-*.txt` |
| 9 lower-thirds and 35 feature labels, transparent | Choose the music bed (brief in section 5) |
| Logo lockup (`cards/logo.svg`) | Add contact details to the end card (`cards/build-cards.mjs`, `t11-end-card`, then `node cards/build-cards.mjs t11`) |
| Production guide with the edit recipe | Assemble in DaVinci Resolve or CapCut following `06-production-guide.md` |

Optional: AI-generated stills for the problem segment are described in `04-asset-brief.md` section 4. The films work without them; the typographic cards are the intended look.
