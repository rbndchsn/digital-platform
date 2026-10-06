// GitHub Pages has no SPA rewrite; serving index.html as 404.html makes deep links work.
import { copyFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const dist = resolve(process.cwd(), 'dist')
copyFileSync(resolve(dist, 'index.html'), resolve(dist, '404.html'))
writeFileSync(resolve(dist, '.nojekyll'), '')
console.log('gh-pages: wrote 404.html and .nojekyll')
