// Shared look for every generated graphic: brand tokens from the marketing brief, 1920 × 1080 canvas.
export const FONTS = 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Source+Sans+3:wght@400;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap'

export const tokens = {
  ink: '#0b1f1e', ink2: '#122020', text: '#e6f0ef', muted: '#a3b5b4', subtle: '#7f9492', line: '#274140',
  teal: '#2dd4bf', tealDeep: '#0f766e', tealSoft: '#11312e',
  orange: '#fb923c', orangeSoft: '#3a2113', red: '#f87171', redSoft: '#3b1717', amber: '#fbbf24', amberSoft: '#3a2d10',
  blue: '#60a5fa', blueSoft: '#1e3a5f', green: '#34d399', greenSoft: '#0f2f26',
}

export const baseCss = `
@import url('${FONTS}');
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1920px;height:1080px;overflow:hidden}
body{background:${tokens.ink};color:${tokens.text};font-family:"Source Sans 3","Segoe UI",system-ui,sans-serif;font-size:34px;line-height:1.35;-webkit-font-smoothing:antialiased}
body.transparent{background:transparent}
.frame{position:relative;width:1920px;height:1080px;padding:120px 140px;display:flex;flex-direction:column;justify-content:center}
.frame.center{align-items:center;text-align:center}
.grain{position:absolute;inset:0;pointer-events:none;background:
  radial-gradient(1200px 700px at 20% 110%, rgba(45,212,191,.14), transparent 60%),
  radial-gradient(900px 600px at 95% -10%, rgba(45,212,191,.08), transparent 60%)}
.rule{position:absolute;left:140px;right:140px;bottom:96px;height:2px;background:linear-gradient(90deg,${tokens.teal},transparent 70%)}
.display{font-family:Fraunces,Georgia,serif;font-weight:600;letter-spacing:-.01em;line-height:1.08}
.h1{font-size:112px}.h2{font-size:84px}.h3{font-size:60px}.h4{font-size:44px}
.lead{font-size:40px;color:${tokens.muted}}
.eyebrow{font-family:"IBM Plex Mono",monospace;font-size:26px;letter-spacing:.14em;text-transform:uppercase;color:${tokens.teal}}
.mono{font-family:"IBM Plex Mono",monospace}
.muted{color:${tokens.muted}}.teal{color:${tokens.teal}}.orange{color:${tokens.orange}}
.chip{display:inline-flex;align-items:center;gap:14px;border-radius:999px;padding:10px 28px;font-weight:600;font-size:30px;border:2px solid ${tokens.line};background:${tokens.ink2}}
.chip.teal{border-color:${tokens.teal};background:${tokens.tealSoft};color:${tokens.teal}}
.chip.amber{border-color:${tokens.amber};background:${tokens.amberSoft};color:${tokens.amber}}
.chip.red{border-color:${tokens.red};background:${tokens.redSoft};color:${tokens.red}}
.chip.green{border-color:${tokens.green};background:${tokens.greenSoft};color:${tokens.green}}
.card{background:${tokens.ink2};border:2px solid ${tokens.line};border-radius:28px;padding:44px 48px}
.logo{display:inline-flex;align-items:center;gap:26px}
.logo .mark{width:92px;height:92px;border-radius:24px;background:${tokens.tealDeep};display:grid;place-items:center;box-shadow:0 10px 40px rgba(45,212,191,.25)}
.logo .mark svg{width:56px;height:56px}
.logo .word{font-weight:700;font-size:64px;letter-spacing:.02em}
.logo .word span{color:${tokens.teal}}
.cols{display:grid;gap:36px}
.cols.three{grid-template-columns:repeat(3,1fr)}
.cols.two{grid-template-columns:repeat(2,1fr)}
ul.clean{list-style:none}
ul.clean li{position:relative;padding-left:44px;margin:10px 0;font-size:31px;color:${tokens.text}}
ul.clean li::before{content:"";position:absolute;left:0;top:.52em;width:18px;height:18px;border-radius:50%;background:${tokens.teal}}
.flow{display:flex;align-items:center;gap:18px;justify-content:center}
.flow .step{display:flex;flex-direction:column;align-items:center;gap:14px}
.flow .step .n{font-family:"IBM Plex Mono",monospace;font-size:26px;color:${tokens.subtle};letter-spacing:.1em}
.flow .step .w{font-family:Fraunces,Georgia,serif;font-weight:600;font-size:54px;padding:16px 38px;border-radius:22px;border:2px solid ${tokens.line};background:${tokens.ink2}}
.flow .step.on .w{border-color:${tokens.teal};color:${tokens.teal};background:${tokens.tealSoft}}
.flow .arrow{width:52px;height:2px;background:${tokens.line}}
.lt{position:absolute;right:120px;bottom:110px;display:flex;align-items:stretch;border-radius:18px;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,.35)}
.lt .bar{width:14px;background:${tokens.teal}}
.lt .body{background:rgba(11,31,30,.94);padding:22px 36px 24px 30px}
.lt .name{font-family:Fraunces,Georgia,serif;font-weight:600;font-size:44px;line-height:1.1;color:${tokens.text}}
.lt .role{font-size:28px;color:${tokens.muted};margin-top:4px}
.label{position:absolute;left:120px;bottom:110px;display:inline-flex;align-items:center;gap:18px;background:rgba(11,31,30,.94);border:2px solid ${tokens.teal};color:${tokens.text};border-radius:999px;padding:16px 38px 16px 30px;font-size:34px;font-weight:600;box-shadow:0 12px 40px rgba(0,0,0,.35)}
.label::before{content:"";width:16px;height:16px;border-radius:50%;background:${tokens.teal};box-shadow:0 0 0 8px ${tokens.tealSoft}}
.foot{position:absolute;left:140px;right:140px;bottom:120px;display:flex;justify-content:space-between;align-items:center;font-size:28px;color:${tokens.subtle}}
`

export const check = `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>`
export const logo = (size = 1) => `<div class="logo" style="transform:scale(${size});transform-origin:left center"><div class="mark">${check}</div><div class="word">VERIFASSUR<span>_X</span></div></div>`

export const page = (body, { transparent = false, extraCss = '' } = {}) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>card</title><style>${baseCss}${extraCss}</style></head><body class="${transparent ? 'transparent' : ''}">${body}</body></html>`
