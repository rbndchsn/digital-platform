// Scratch narration with the macOS built-in voice, one WAV per scene, straight from scenes.mjs.
// Use it to lock timing before you record (or buy) the real voice.
// Usage, from marketing/video-marketing:
//   node mac/scratch-vo.mjs              -> audio/scratch/teaser-T1.wav … audio/scratch/full-F13.wav
//   node mac/scratch-vo.mjs teaser       -> only one film
//   VOICE=Daniel RATE=135 node mac/scratch-vo.mjs
//   node mac/scratch-vo.mjs --print      -> show the `say` commands without running them (works on any OS)
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { teaser, full } from '../scenes.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const outDir = resolve(here, '..', 'audio', 'scratch')
mkdirSync(outDir, { recursive: true })
const args = process.argv.slice(2)
const printOnly = args.includes('--print')
const only = args.find((a) => !a.startsWith('--'))
const voice = process.env.VOICE ?? 'Daniel'
const rate = process.env.RATE ?? '135' // words per minute; the scripts are paced at 130

const spoken = (vo) => vo.split('\n').map((l) => l.trim()).filter((l) => l && !/^\[.*\]$/.test(l)).join('\n')

for (const [name, video] of [['teaser', teaser], ['full', full]]) {
  if (only && only !== name) continue
  for (const s of video.scenes) {
    const text = spoken(s.vo ?? '')
    if (!text) continue
    const file = resolve(outDir, `${name}-${s.id}.wav`)
    const cmd = ['say', '-v', voice, '-r', rate, '-o', file, '--data-format=LEI16@48000', text]
    if (printOnly) { console.log(cmd.map((c) => (/\s/.test(c) ? JSON.stringify(c) : c)).join(' ')); continue }
    const r = spawnSync(cmd[0], cmd.slice(1), { stdio: 'inherit' })
    console.log(`${name}-${s.id}: ${r.status === 0 ? 'ok' : 'failed (is this macOS? try --print)'}`)
  }
}
