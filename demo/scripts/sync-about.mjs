// Copies the marketing brief (marketing/marketing_v1.html + marketingimages/) into public/about/ so the demo serves it
// at /about/ next to the app. Runs before every build (`npm run build`); the marketing folder stays the source of truth.
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const src = resolve('../marketing')
const out = resolve('public/about')
rmSync(out, { recursive: true, force: true })
mkdirSync(resolve(out, 'marketingimages'), { recursive: true })
const html = readFileSync(resolve(src, 'marketing_v1.html'), 'utf8')
writeFileSync(resolve(out, 'index.html'), html)
cpSync(resolve(src, 'marketingimages'), resolve(out, 'marketingimages'), { recursive: true, filter: (p) => !p.endsWith('.md') })
console.log('about page synced to public/about')
