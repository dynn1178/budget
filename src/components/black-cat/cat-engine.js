/**
 * Black Cat — procedural SVG pet animation engine (no dependencies).
 *
 * The cat is a small rig (hip / chest / head / 4 IK legs / tapered tail) whose
 * pose parameters are driven by critically-damped springs. Every behaviour just
 * sets a *target pose*; the springs blend between poses, and each body part has
 * its own stiffness so motion has natural overlap & follow-through (body leads,
 * head follows, tail lags behind).
 *
 * Behaviours: walk · stand · sit · groom(lick) · wash(paw face-wash) · lie ·
 *             sleep · stretch(yawn) · petted(purr) · watch/follow cursor
 *
 * Usage:
 *   const cat = createBlackCat(containerEl, { size: 1, glow: 'auto' })
 *   cat.destroy()
 */

const NS = 'http://www.w3.org/2000/svg'
const TAU = Math.PI * 2

/* ----------------------------------------------------------------- utils */
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)
const lerp = (a, b, t) => a + (b - a) * t
const rand = (a, b) => a + Math.random() * (b - a)
const pick = (arr) => arr[(Math.random() * arr.length) | 0]
const smooth = (t) => t * t * (3 - 2 * t)
function weighted(table) {
  let sum = 0
  for (const k in table) sum += table[k]
  let r = Math.random() * sum
  for (const k in table) {
    r -= table[k]
    if (r <= 0) return k
  }
  return Object.keys(table)[0]
}
function el(tag, attrs, parent) {
  const n = document.createElementNS(NS, tag)
  if (attrs) for (const k in attrs) n.setAttribute(k, attrs[k])
  if (parent) parent.appendChild(n)
  return n
}
const f1 = (n) => Math.round(n * 10) / 10
const f2 = (n) => Math.round(n * 100) / 100

/* ------------------------------------------------------------ pose data */
// Local cat space: facing +x, ground at y = 0, up is −y. Units ≈ px at size 1.
const POSES = {
  stand: {
    hipX: -18, hipY: -30, chestX: 13, chestY: -31, rHip: 15.5, rChest: 15,
    headX: 28, headY: -60, headRot: 0, shoulderDy: 4, hindBend: 0,
    fNx: 15, fNy: 0, fFx: 8, fFy: 0, hNx: -17, hNy: 0, hFx: -24, hFy: 0,
    hauX: -1, hauY: 2, hauRx: 12.5, hauRy: 13.5, hauRot: 12,
    tailBase: 1.05, tailCurl: -0.07, tailTip: 0.26, tailSway: 0.12, tailSpeed: 0.9, tailFront: 0,
  },
  sit: {
    hipX: -10, hipY: -17, chestX: 4, chestY: -37, rHip: 18, rChest: 14,
    headX: 7, headY: -66, headRot: 0, shoulderDy: 8, hindBend: 1,
    fNx: 10, fNy: 0, fFx: 4, fFy: 0, hNx: 10, hNy: 0, hFx: 4, hFy: 0,
    hauX: 2, hauY: 3, hauRx: 17, hauRy: 14, hauRot: -8,
    tailBase: -0.35, tailCurl: 0.0, tailTip: 0.3, tailSway: 0.05, tailSpeed: 0.5, tailFront: 0,
  },
  lie: {
    hipX: -19, hipY: -13, chestX: 11, chestY: -15, rHip: 13.5, rChest: 13.5,
    headX: 25, headY: -38, headRot: 0, shoulderDy: 5, hindBend: 1,
    fNx: 34, fNy: 0, fFx: 29, fFy: 0, hNx: -2, hNy: 0, hFx: -7, hFy: 0,
    hauX: 3, hauY: 2, hauRx: 15, hauRy: 10.5, hauRot: -4,
    tailBase: -1.15, tailCurl: -0.2, tailTip: 0, tailSway: 0.03, tailSpeed: 0.45, tailFront: 1,
  },
  sleep: {
    hipX: -16, hipY: -12.5, chestX: 8, chestY: -12.5, rHip: 14.5, rChest: 13,
    headX: 25, headY: -26, headRot: 14, shoulderDy: 5, hindBend: 1,
    fNx: 32, fNy: 0, fFx: 27, fFy: 0, hNx: 0, hNy: 0, hFx: -5, hFy: 0,
    hauX: 3, hauY: 2, hauRx: 15, hauRy: 10.5, hauRot: -4,
    tailBase: -1.05, tailCurl: -0.24, tailTip: 0, tailSway: 0.012, tailSpeed: 0.3, tailFront: 1,
  },
  stretch: {
    hipX: -17, hipY: -34, chestX: 10, chestY: -17, rHip: 15, rChest: 13,
    headX: 28, headY: -27, headRot: -6, shoulderDy: 4, hindBend: 0,
    fNx: 42, fNy: 0, fFx: 37, fFy: 0, hNx: -16, hNy: 0, hFx: -23, hFy: 0,
    hauX: -1, hauY: 2, hauRx: 12.5, hauRy: 13.5, hauRot: 12,
    tailBase: 1.3, tailCurl: -0.05, tailTip: 0.28, tailSway: 0.05, tailSpeed: 0.6, tailFront: 0,
  },
}

const FACE = {
  eyeOpen: 1, happy: 0, earBack: 0, tongue: 0, mouth: 0, blush: 0, purr: 0,
  lookW: 1, washW: 0, pupil: 3.9, stateTurn: 0, breathHz: 0.32,
}

// Spring stiffness per parameter: body leads, head follows, tail lags.
function omegaFor(k) {
  if (k.startsWith('tail')) return k === 'tailFront' ? 4 : 3.2
  if (k.startsWith('head')) return 5.6
  if (/^[fh][NF][xy]$/.test(k)) return 8
  if (k.startsWith('hau')) return 6.5
  if (k in FACE) {
    return { eyeOpen: 14, mouth: 14, tongue: 12, earBack: 10, happy: 9, pupil: 6,
      stateTurn: 6, washW: 5, purr: 5, blush: 4, lookW: 4, breathHz: 2 }[k]
  }
  return 6.5
}

const HEAD_SCALE = 1
const LF = 14.5 // front leg bone length
const LH = 14.5 // hind leg bone length

const MEOWS = ['냐옹~', '냥!', '미야옹', '냐아~', '먀!']

/* ============================================================== engine */
export function createBlackCat(container, options = {}) {
  const opt = { size: 1, glow: 'auto', interactive: true, ...options }
  const S = opt.size

  /* ------------------------------------------------------------- DOM */
  const svg = el('svg', { class: 'black-cat-svg', 'aria-hidden': 'true' })
  Object.assign(svg.style, {
    position: 'absolute', inset: '0', width: '100%', height: '100%',
    overflow: 'visible', pointerEvents: 'none', userSelect: 'none',
  })
  container.appendChild(svg)

  const uid = 'bc' + Math.random().toString(36).slice(2, 8)
  const defs = el('defs', null, svg)
  const grad = (type, id, attrs, stops) => {
    const g = el(type, { id: uid + id, ...attrs }, defs)
    for (const [o, c, a] of stops) el('stop', { offset: o, 'stop-color': c, ...(a != null ? { 'stop-opacity': a } : {}) }, g)
  }
  // fur: warm charcoal, lit from the top (userSpace → no seams between body parts)
  grad('linearGradient', 'fur', { gradientUnits: 'userSpaceOnUse', x1: 0, y1: -72, x2: 0, y2: 0 },
    [['0', '#3e3546'], ['0.45', '#2b2431'], ['1', '#1b161f']])
  grad('radialGradient', 'head', { gradientUnits: 'userSpaceOnUse', cx: -7, cy: -14, r: 46 },
    [['0', '#4a3f53'], ['0.45', '#2e2735'], ['1', '#1c1720']])
  grad('radialGradient', 'iris', { cx: '50%', cy: '72%', r: '70%' },
    [['0', '#fff6b4'], ['0.38', '#ffd94c'], ['0.78', '#f4a81a'], ['1', '#b86d06']])
  grad('radialGradient', 'pupil', { cx: '45%', cy: '40%', r: '60%' },
    [['0', '#4d2c12'], ['1', '#120904']])
  grad('linearGradient', 'ear', { x1: 0, y1: 1, x2: 0, y2: 0 },
    [['0', '#e47a8b'], ['1', '#f9bcc3']])
  grad('radialGradient', 'bell', { cx: '35%', cy: '30%', r: '75%' },
    [['0', '#fff6c2'], ['0.45', '#f5c540'], ['1', '#b17810']])
  grad('radialGradient', 'sheen', { cx: '50%', cy: '50%', r: '50%' },
    [['0', '#fff', 0.16], ['1', '#fff', 0]])
  grad('radialGradient', 'muzzle', { cx: '50%', cy: '40%', r: '50%' },
    [['0', '#fff', 0.12], ['1', '#fff', 0]])
  grad('radialGradient', 'blush', { cx: '50%', cy: '50%', r: '50%' },
    [['0', '#ff7f9e', 0.9], ['1', '#ff7f9e', 0]])

  const C_BODY = `url(#${uid}fur)`
  const C_FAR = '#18141c'
  const C_HEAD = `url(#${uid}head)`
  const legAttr = (c, w) => ({ fill: 'none', stroke: c, 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })

  const shadow = el('ellipse', { fill: '#000', opacity: '0.16' }, svg)
  const catG = el('g', null, svg)
  const jitterG = el('g', null, catG)

  const tailBackL = el('g', null, jitterG)
  const legFF = el('path', legAttr(C_FAR, 11), jitterG)
  const pawFF = el('ellipse', { rx: 6.4, ry: 4.4, fill: C_FAR }, jitterG)
  const legHF = el('path', legAttr(C_FAR, 11), jitterG)
  const pawHF = el('ellipse', { rx: 6.4, ry: 4.4, fill: C_FAR }, jitterG)

  const bodyG = el('g', { fill: C_BODY }, jitterG)
  const bodyConn = el('polygon', null, bodyG)
  const hipC = el('circle', null, bodyG)
  const chestC = el('circle', null, bodyG)
  const bellyC = el('circle', null, bodyG)
  const neck = el('line', { stroke: C_BODY, 'stroke-width': 22, 'stroke-linecap': 'round' }, bodyG)
  const sheen = el('ellipse', { fill: `url(#${uid}sheen)` }, jitterG)
  const haunch = el('ellipse', { fill: C_BODY }, jitterG)
  const legHN = el('path', legAttr(C_BODY, 11.5), jitterG)
  const pawHN = el('ellipse', { rx: 6.8, ry: 4.6, fill: C_BODY }, jitterG)

  // ---- head (front-facing, chibi: ~60px wide)
  const headG = el('g', null, jitterG)
  const mkEar = (parent) => {
    const g = el('g', null, parent)
    el('path', { d: 'M-30,-3 C-32.5,-18 -30,-34 -22.5,-43.5 C-20.3,-46.2 -17,-45.6 -15.2,-43 L-4.5,-21 Z', fill: C_HEAD }, g)
    el('path', { d: 'M-26,-10 C-27.5,-21 -25.8,-31 -21.6,-37.6 C-20.6,-39 -19.2,-38.8 -18.4,-37.4 L-10,-21 Z', fill: `url(#${uid}ear)` }, g)
    el('path', { d: 'M-24.5,-13 Q-22.5,-17.5 -19.5,-20 M-23.8,-17.5 Q-22,-21.5 -19.8,-23.6 M-25,-21 Q-23.6,-24 -21.8,-26', fill: 'none', stroke: '#f5eef2', 'stroke-width': 0.6, opacity: '0.7', 'stroke-linecap': 'round' }, g)
    return g
  }
  const earL = mkEar(headG)
  const earRWrap = el('g', { transform: 'scale(-1,1)' }, headG)
  const earR = mkEar(earRWrap)
  const collarG = el('g', null, headG)
  el('path', { d: 'M-16,22 Q0,33.5 16,22', fill: 'none', stroke: '#e3475a', 'stroke-width': 4.4, 'stroke-linecap': 'round' }, collarG)
  el('path', { d: 'M-14.5,22.4 Q0,32.6 14.5,22.4', fill: 'none', stroke: '#ff8a95', 'stroke-width': 1, 'stroke-linecap': 'round', opacity: '0.75' }, collarG)
  const bellG = el('g', null, collarG)
  el('circle', { cx: 0, cy: 4.4, r: 4.6, fill: `url(#${uid}bell)`, stroke: '#9c6a0e', 'stroke-width': 0.5 }, bellG)
  el('path', { d: 'M-3.4,3.6 L3.4,3.6 M0,5.6 L0,8.6', stroke: '#86580a', 'stroke-width': 0.8, 'stroke-linecap': 'round' }, bellG)
  el('circle', { cx: 0, cy: 6, r: 1, fill: '#6b4507' }, bellG)
  el('circle', { cx: -1.6, cy: 2.6, r: 1, fill: '#fff', opacity: '0.85' }, bellG)
  // chubby head with fluffy cheeks
  el('path', {
    d: 'M0,-25 C17,-25 29.5,-15 30.5,0 C31,6 33.5,9 33,12.5 L29.6,13.4 L32,16.6 L27.8,17.6 C23,24.5 12,28 0,28 C-12,28 -23,24.5 -27.8,17.6 L-32,16.6 L-29.6,13.4 L-33,12.5 C-33.5,9 -31,6 -30.5,0 C-29.5,-15 -17,-25 0,-25 Z',
    fill: C_HEAD,
  }, headG)
  el('ellipse', { cx: -6, cy: -15, rx: 15, ry: 7, fill: `url(#${uid}sheen)` }, headG)
  // forehead heart mark
  el('path', { d: 'M0,-9.6 C-3,-11.8 -5.6,-14 -5,-16.8 C-4.4,-19.2 -1.4,-19.2 0,-16.8 C1.4,-19.2 4.4,-19.2 5,-16.8 C5.6,-14 3,-11.8 0,-9.6 Z', fill: '#faf5f2' }, headG)

  const faceG = el('g', null, headG)
  el('ellipse', { cx: 0, cy: 13, rx: 11, ry: 7.5, fill: `url(#${uid}muzzle)` }, faceG)
  const blushL = el('ellipse', { cx: -19.5, cy: 11.5, rx: 6, ry: 3.6, fill: `url(#${uid}blush)`, opacity: 0.35 }, faceG)
  const blushR = el('ellipse', { cx: 19.5, cy: 11.5, rx: 6, ry: 3.6, fill: `url(#${uid}blush)`, opacity: 0.35 }, faceG)
  const eyes = [-1, 1].map((side) => {
    const g = el('g', { transform: `translate(${side * 12.5},1.5)` }, faceG)
    const open = el('g', null, g)
    el('ellipse', { rx: 9.6, ry: 10.4, fill: '#120d14' }, open) // dark rim
    el('ellipse', { rx: 8.8, ry: 9.6, fill: `url(#${uid}iris)` }, open)
    const pupil = el('ellipse', { rx: 5.8, ry: 6.2, fill: `url(#${uid}pupil)` }, open)
    el('ellipse', { cx: 0, cy: 5.6, rx: 5, ry: 2.2, fill: '#ffe98a', opacity: '0.35' }, open)
    const hl = el('ellipse', { cx: -3.2, cy: -4, rx: 3.3, ry: 3, fill: '#fff' }, open)
    const hl2 = el('circle', { cx: 3.6, cy: 3.6, r: 1.5, fill: '#fff', opacity: '0.9' }, open)
    el('circle', { cx: -4.6, cy: 2.4, r: 0.8, fill: '#fff', opacity: '0.7' }, open)
    const closed = el('path', { fill: 'none', stroke: '#d9d2e2', 'stroke-width': 2, 'stroke-linecap': 'round' }, g)
    return { open, pupil, hl, hl2, closed, side }
  })
  el('path', { d: 'M-2.9,8.6 Q0,7.5 2.9,8.6 Q1.5,11.2 0,11.7 Q-1.5,11.2 -2.9,8.6 Z', fill: '#f2909e' }, faceG)
  el('ellipse', { cx: -0.9, cy: 8.8, rx: 0.9, ry: 0.5, fill: '#fff', opacity: '0.7' }, faceG)
  const mouthOpen = el('ellipse', { cx: 0, cy: 15, rx: 3.8, ry: 0, fill: '#9e3a4c' }, faceG)
  const tongue = el('ellipse', { cx: 0, cy: 15.8, rx: 2.8, ry: 0, fill: '#ff9aab' }, faceG)
  el('path', { d: 'M0,11.7 L0,13 M-4.2,12.6 Q-2.1,15.4 0,13 Q2.1,15.4 4.2,12.6', fill: 'none', stroke: '#8d8196', 'stroke-width': 1.05, 'stroke-linecap': 'round' }, faceG)
  el('path', {
    d: 'M-12,11 Q-24,8.5 -38,8 M-12,13 Q-25,13 -39,15 M-12,15 Q-23,17 -35,21.5 M12,11 Q24,8.5 38,8 M12,13 Q25,13 39,15 M12,15 Q23,17 35,21.5',
    fill: 'none', stroke: '#ece6f2', 'stroke-width': 0.6, opacity: '0.7', 'stroke-linecap': 'round',
  }, faceG)

  let bell = { a: 0, v: 0, prevRot: 0 }

  // near front leg on top of head (so the paw can wash the face)
  const legFN = el('path', legAttr(C_BODY, 12), jitterG)
  const pawFNg = el('g', null, jitterG)
  el('ellipse', { rx: 7, ry: 4.8, fill: C_BODY }, pawFNg)
  el('path', { d: 'M-2.2,-1.2 L-2.2,1.8 M1.6,-1.2 L1.6,1.8', stroke: '#141017', 'stroke-width': 0.7, 'stroke-linecap': 'round', opacity: '0.7' }, pawFNg)
  const beans = el('g', { fill: '#f59fb0', opacity: 0 }, pawFNg)
  el('ellipse', { cx: 0, cy: 1.4, rx: 2.9, ry: 2.2 }, beans)
  el('circle', { cx: -3.6, cy: -2, r: 1.25 }, beans)
  el('circle', { cx: 0, cy: -3.2, r: 1.25 }, beans)
  el('circle', { cx: 3.6, cy: -2, r: 1.25 }, beans)

  const tailFrontL = el('g', null, jitterG)
  const tailG = el('g', { fill: C_BODY, stroke: C_BODY, 'stroke-width': 1, 'stroke-linejoin': 'round' }, tailBackL)
  const tailPath = el('path', null, tailG)
  const tailTipC = el('circle', null, tailG)
  let tailInFront = false

  // hit areas (only these receive pointer events, rest of page stays clickable)
  const hitStyle = { fill: 'transparent', 'pointer-events': opt.interactive ? 'all' : 'none' }
  const hitBody = el('circle', hitStyle, catG)
  const hitHead = el('circle', hitStyle, catG)
  for (const h of [hitBody, hitHead]) {
    h.style.cursor = 'grab'
    h.style.touchAction = 'none'
  }

  const fxG = el('g', { 'pointer-events': 'none' }, svg)
  const bubbleG = el('g', { opacity: 0 }, svg)
  const bubbleRect = el('rect', { rx: 10, ry: 10, fill: '#fff', stroke: '#2a2833', 'stroke-width': 1.2 }, bubbleG)
  const bubbleText = el('text', {
    'font-size': 12, 'font-weight': 700, fill: '#2a2833', 'text-anchor': 'middle', 'dominant-baseline': 'central',
    'font-family': "'Pretendard Variable','Pretendard',-apple-system,sans-serif",
  }, bubbleG)

  /* ------------------------------------------------------------ state */
  let W = container.clientWidth || 600
  let H = container.clientHeight || 140 * S
  const groundY = () => H - 6 * S

  const P = {} // current spring values
  const V = {} // spring velocities
  const T = {} // targets
  const init = { ...POSES.sit, ...FACE }
  for (const k in init) { P[k] = init[k]; V[k] = 0; T[k] = init[k] }

  const cat = {
    x: W * rand(0.3, 0.7), vel: 0, face: 1, faceV: 0, faceT: Math.random() < 0.5 ? 1 : -1,
    phase: 0, walkW: 0,
  }
  cat.face = cat.faceT

  let state = { name: 'sit', t: 0, dur: 3, data: {} }
  let queue = []
  let time = 0
  let tailPhase = 0

  const pointer = { x: -1e4, y: -1e4, lastMove: -1e9, speed: 0, inside: false }
  const look = { turn: 0, turnV: 0, pitch: 0, pitchV: 0, px: 0, pxV: 0, py: 0, pyV: 0, tilt: 0, tiltV: 0, tiltT: 0, idleX: 0, idleY: 0, nextIdle: 0, nextTilt: rand(4, 9) }
  const blink = { next: rand(1.5, 4), t: -1, dur: 0.15, slow: false, slowCooldown: 3 }
  const ears = { l: 0, lv: 0, r: 0, rv: 0, next: rand(2, 6) }
  let pet = { energy: 0, lastPet: -1e9, lastX: null, lastY: null, heartT: 0 }
  let meow = { t: -1, text: '' }
  let zzzT = 0
  let followCheck = 0
  let faceFlipT = 0
  const particles = []

  /* ------------------------------------------------- behaviour states */
  const baseOf = (n) =>
    n === 'petted' ? state.data.base
      : n === 'sit' || n === 'groom' || n === 'wash' || n === 'watch' ? 'sit'
        : n === 'lie' || n === 'wake' ? 'lie'
          : n === 'sleep' ? 'sleep'
            : n === 'stretch' ? 'stretch' : 'stand'

  const DUR = {
    stand: [2, 4], sit: [4, 8], groom: [5, 7.5], wash: [5, 7.5], lie: [4, 7], sleep: [14, 26],
    stretch: [2.8, 2.8], watch: [3, 6], wake: [2.2, 2.2], walk: [99, 99], petted: [99, 99],
  }

  function setState(name, data = {}) {
    const d = DUR[name] || [3, 5]
    state = { name, t: 0, dur: rand(d[0], d[1]), data }
    if (name === 'walk' && data.target == null) {
      const m = 70 * S
      let tx = rand(m, Math.max(m + 1, W - m))
      if (Math.abs(tx - cat.x) < 110 * S) tx = cat.x > W / 2 ? Math.max(m, cat.x - rand(130, 260) * S) : Math.min(W - m, cat.x + rand(130, 260) * S)
      data.target = tx
    }
  }

  // go to a behaviour, inserting natural intermediate poses
  function goTo(name, data = {}) {
    const cur = baseOf(state.name)
    const tgt = name === 'groom' || name === 'wash' || name === 'watch' ? 'sit'
      : name === 'lie' ? 'lie' : name === 'sleep' ? 'sleep'
        : name === 'walk' || name === 'stand' ? 'stand' : 'x'
    queue = []
    if ((tgt === 'stand') && (cur === 'sleep')) {
      setState('wake'); queue.push(['stretch', {}], [name, data]); return
    }
    if ((tgt === 'stand') && cur === 'lie') {
      setState('stretch'); queue.push([name, data]); return
    }
    if (tgt === 'lie' && cur === 'stand') {
      setState('sit'); state.dur = 1.1; queue.push([name, data]); return
    }
    if (tgt === 'sleep') {
      if (cur === 'stand') { setState('sit'); state.dur = 1.1; queue.push(['lie', { __dur: 1.8 }], ['sleep', data]); return }
      if (cur === 'sit') { setState('lie'); state.dur = 1.8; queue.push(['sleep', data]); return }
    }
    if (tgt === 'sit' && cur === 'sleep') { setState('wake'); queue.push([name, data]); return }
    setState(name, data)
  }

  function nextState() {
    if (queue.length) {
      const [n, d] = queue.shift()
      setState(n, d)
      if (d.__dur) state.dur = d.__dur
      return
    }
    const n = state.name
    const table = {
      stand: { walk: 45, sit: 30, stand: 12, lie: 8, wash: 5 },
      walk: { stand: 30, sit: 42, wash: 14, groom: 14 },
      sit: { groom: 22, wash: 22, lie: 18, walk: 26, stand: 12 },
      groom: { sit: 55, lie: 20, walk: 25 },
      wash: { sit: 55, lie: 20, walk: 25 },
      watch: { sit: 40, walk: 30, wash: 15, groom: 15 },
      lie: { sleep: 55, sit: 22, walk: 23 },
      sleep: { walk: 60, sit: 40 },
      wake: { stand: 100 },
      stretch: { walk: 70, stand: 30 },
      petted: { sit: 100 },
    }[n] || { sit: 1 }
    if (n === 'petted') {
      const b = state.data.base
      return goTo(b === 'lie' || b === 'sleep' ? 'lie' : 'sit')
    }
    goTo(weighted(table))
  }

  function targetFor() {
    const n = state.name
    const b = baseOf(n)
    const tgt = { ...POSES[b === 'stretch' ? 'stretch' : b], ...FACE }
    const t = state.t
    switch (n) {
      case 'walk':
        Object.assign(tgt, { tailSway: 0.14, tailSpeed: 1.25, lookW: 0.65, pupil: 3.7 })
        break
      case 'watch':
        Object.assign(tgt, { pupil: 4.8, lookW: 1, tailSway: 0.07, tailSpeed: 1.1 })
        break
      case 'groom': {
        const chest = Math.floor(t / 2.8) % 2 === 1
        Object.assign(tgt, chest
          ? { headX: 11, headY: -50, headRot: 30, stateTurn: 0.6 }
          : { headX: -3, headY: -48, headRot: -30, stateTurn: -1 })
        Object.assign(tgt, { eyeOpen: 0.04, tongue: 1, happy: 0.3, lookW: 0, earBack: 0.12 })
        break
      }
      case 'wash':
        Object.assign(tgt, { eyeOpen: 0.28, happy: 0.25, lookW: 0, washW: 1 })
        break
      case 'lie':
        Object.assign(tgt, { eyeOpen: 0.82, breathHz: 0.26 })
        break
      case 'wake': // yawn while lying
        Object.assign(tgt, t > 0.3 && t < 1.6
          ? { eyeOpen: 0, mouth: 1, earBack: 0.3, lookW: 0, headRot: -10, headY: -41 }
          : { eyeOpen: 0.6 })
        break
      case 'sleep':
        Object.assign(tgt, { eyeOpen: 0, lookW: 0, breathHz: 0.2, earBack: 0.15, happy: 0 })
        break
      case 'stretch':
        Object.assign(tgt, t < 1.5 ? { eyeOpen: 0.08, mouth: 0.85, lookW: 0, happy: 0.1 } : { eyeOpen: 1, lookW: 0.5 })
        break
      case 'petted': {
        Object.assign(tgt, { eyeOpen: 0, happy: 1, earBack: 0.32, blush: 1, purr: 1, lookW: 0.35, breathHz: 0.42 })
        if (b === 'stand') Object.assign(tgt, { tailBase: 1.5, tailCurl: -0.012, tailTip: 0.34, tailSway: 0.05, tailSpeed: 2.6 })
        if (b === 'sit') Object.assign(tgt, { headRot: 0, tailSway: 0.07, tailSpeed: 1.2 })
        if (b === 'lie') Object.assign(tgt, { headRot: 8, headY: -35 })
        break
      }
    }
    return tgt
  }

  /* ------------------------------------------------------ interaction */
  const toLocalPointer = () => ({
    x: (pointer.x - cat.x) / (S * (Math.sign(cat.face) || 1)),
    y: (pointer.y - groundY()) / S,
  })

  function onWindowMove(e) {
    const r = svg.getBoundingClientRect()
    const nx = e.clientX - r.left
    const ny = e.clientY - r.top
    const dt = Math.max(1, e.timeStamp - (pointer.lastTs || 0))
    pointer.speed = Math.hypot(nx - pointer.x, ny - pointer.y) / dt * 1000
    pointer.lastTs = e.timeStamp
    pointer.x = nx; pointer.y = ny
    pointer.lastMove = time
    pointer.inside = true
  }
  function onWindowLeave() { pointer.inside = false }

  function onPetMove(e) {
    const r = svg.getBoundingClientRect()
    const x = e.clientX - r.left, y = e.clientY - r.top
    if (pet.lastX != null) {
      const d = Math.min(40, Math.hypot(x - pet.lastX, y - pet.lastY))
      const onHead = e.currentTarget === hitHead
      pet.energy = Math.min(3, pet.energy + d * 0.011 * (onHead ? 1.5 : 1))
      pet.lastPet = time
    }
    pet.lastX = x; pet.lastY = y
    if (pet.energy > 0.55 && state.name !== 'petted') startPetted()
  }
  function onPetLeave() { pet.lastX = pet.lastY = null }
  function onPetDown(e) {
    e.currentTarget.setPointerCapture?.(e.pointerId)
    pet.lastX = null
    pet.energy = Math.min(3, pet.energy + 0.25)
    pet.lastPet = time
    doMeow()
    if (state.name === 'sleep') { burst(3); startPetted() }
    else burst(2)
  }
  function startPetted() {
    if (state.name === 'petted') return
    const b = baseOf(state.name)
    queue = []
    setState('petted', { base: b === 'sleep' || b === 'lie' ? 'lie' : b === 'stretch' ? 'stand' : b })
    cat.vel *= 0.3
  }
  function doMeow() {
    meow = { t: 0, text: pick(MEOWS) }
    ears.lv -= 200; ears.rv -= 200
  }

  window.addEventListener('pointermove', onWindowMove, { passive: true })
  document.addEventListener('pointerleave', onWindowLeave)
  for (const h of [hitBody, hitHead]) {
    h.addEventListener('pointermove', onPetMove)
    h.addEventListener('pointerleave', onPetLeave)
    h.addEventListener('pointerdown', onPetDown)
  }

  /* -------------------------------------------------------- particles */
  function spawnHeart(x, y, big) {
    const g = el('g', null, fxG)
    el('path', { d: 'M0,3.2 C-4.5,-0.8 -6.4,-4 -3.4,-6.2 C-1.4,-7.4 0,-5.6 0,-4.4 C0,-5.6 1.4,-7.4 3.4,-6.2 C6.4,-4 4.5,-0.8 0,3.2 Z', fill: pick(['#ff7d9c', '#ff94b0', '#ff6f91']) }, g)
    particles.push({ g, x, y, vx: rand(-8, 8), vy: rand(-30, -20) * S, life: 0, max: rand(1.4, 2), s: (big ? 1.3 : 1) * S * rand(0.85, 1.15), type: 'heart', ph: rand(0, TAU) })
  }
  function spawnZ(x, y) {
    const g = el('g', null, fxG)
    const t = el('text', { 'font-size': 11, 'font-weight': 700, fill: '#9ea3ba', 'font-family': 'ui-rounded,system-ui,sans-serif', 'text-anchor': 'middle' }, g)
    t.textContent = 'z'
    particles.push({ g, x, y, vx: 9 * Math.sign(cat.face) * S, vy: -12 * S, life: 0, max: 2.6, s: S, type: 'z', ph: rand(0, TAU) })
  }
  function burst(n) {
    const h = headWorld()
    for (let i = 0; i < n; i++) spawnHeart(h.x + rand(-14, 14) * S, h.y - 34 * S, true)
  }
  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]
      p.life += dt
      const u = p.life / p.max
      if (u >= 1) { p.g.remove(); particles.splice(i, 1); continue }
      p.x += (p.vx + Math.sin(p.life * 3 + p.ph) * 10 * S) * dt
      p.y += p.vy * dt
      const pop = p.type === 'heart' ? Math.min(1, p.life / 0.18) * (1 + 0.15 * Math.sin(p.life * 9)) : 0.7 + u * 0.8
      const a = u < 0.15 ? u / 0.15 : 1 - smooth((u - 0.15) / 0.85)
      p.g.setAttribute('transform', `translate(${f1(p.x)},${f1(p.y)}) scale(${f2(p.s * pop)})`)
      p.g.setAttribute('opacity', f2(a))
    }
  }

  /* -------------------------------------------------------- geometry */
  function toWorld(lx, ly) {
    return { x: cat.x + lx * S * cat.face, y: groundY() + ly * S }
  }
  function headWorld() { return toWorld(P.headX, P.headY) }

  // 2-bone IK. pref = preferred bend direction for the joint.
  function ik(rx, ry, tx, ty, a, b, prefX, prefY) {
    let dx = tx - rx, dy = ty - ry
    let d = Math.hypot(dx, dy) || 0.001
    const dc = clamp(d, Math.abs(a - b) + 0.5, a + b - 0.05)
    const ux = dx / d, uy = dy / d
    const ex = rx + ux * dc, ey = ry + uy * dc // reachable end
    const ca = (a * a + dc * dc - b * b) / (2 * a * dc)
    const along = a * ca
    const h = Math.sqrt(Math.max(0, a * a - along * along))
    let nx = -uy, ny = ux
    if (nx * prefX + ny * prefY < 0) { nx = -nx; ny = -ny }
    let kx = rx + ux * along + nx * h
    let ky = ry + uy * along + ny * h
    if (ky > -3.5) ky = -3.5 // keep knee/elbow above ground
    return { kx, ky, ex, ey }
  }

  function legPath(rx, ry, k) {
    return `M${f1(rx)},${f1(ry)} L${f1(k.kx)},${f1(k.ky)} L${f1(k.ex)},${f1(k.ey)}`
  }

  function gait(p) {
    const beta = 0.6, stride = 17, lift = 5.5
    if (p < beta) return { dx: stride / 2 - stride * (p / beta), dy: 0 }
    const q = (p - beta) / (1 - beta)
    return { dx: -stride / 2 + stride * smooth(q), dy: -lift * Math.sin(Math.PI * q) }
  }

  function buildTail(Q, rootX, rootY) {
    const N = 12, seg = 4.7
    let x = rootX, y = rootY
    const pts = [[x, y]]
    for (let i = 0; i < N; i++) {
      const u = i / N
      let a = Q.tailBase + Q.tailCurl * i
      if (i >= N - 6) a += Q.tailTip * 0.55 * (i - (N - 7))
      a += Q.tailSway * Math.sin(tailPhase - i * 0.42) * (0.35 + u * 1.3)
      x += -Math.cos(a) * seg
      y += -Math.sin(a) * seg
      if (y > -3.2) y = lerp(y, -3.2, 0.85) // rest on the ground
      pts.push([x, y])
    }
    const L = [], R = []
    for (let i = 0; i <= N; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[Math.min(N, i + 1)]
      let tx = p1[0] - p0[0], ty = p1[1] - p0[1]
      const tl = Math.hypot(tx, ty) || 1
      tx /= tl; ty /= tl
      const w = 3.6 + 1.1 * Math.sin(Math.PI * (0.1 + i / N * 0.8))
      L.push([pts[i][0] - ty * w, pts[i][1] + tx * w])
      R.push([pts[i][0] + ty * w, pts[i][1] - tx * w])
    }
    let d = `M${f1(L[0][0])},${f1(L[0][1])}`
    for (let i = 1; i <= N; i++) d += ` L${f1(L[i][0])},${f1(L[i][1])}`
    for (let i = N; i >= 0; i--) d += ` L${f1(R[i][0])},${f1(R[i][1])}`
    tailPath.setAttribute('d', d + 'Z')
    tailTipC.setAttribute('cx', f1(pts[N][0]))
    tailTipC.setAttribute('cy', f1(pts[N][1]))
    tailTipC.setAttribute('r', 3.9)
  }

  /* ------------------------------------------------------------ glow */
  function applyGlow() {
    let on = opt.glow === true
    if (opt.glow === 'auto') {
      const th = document.documentElement.getAttribute('data-theme')
      on = th ? th === 'dark' : window.matchMedia?.('(prefers-color-scheme: dark)').matches
    }
    catG.style.filter = on ? 'drop-shadow(0 0 1.2px rgba(255,255,255,.55)) drop-shadow(0 0 6px rgba(190,200,255,.18))' : ''
    shadow.setAttribute('opacity', on ? '0.35' : '0.16')
  }
  applyGlow()
  const mo = new MutationObserver(applyGlow)
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

  /* ------------------------------------------------------------- loop */
  function think(dt) {
    state.t += dt
    const n = state.name

    // petting decay / exit
    pet.energy = Math.max(0, pet.energy - dt * (n === 'petted' ? 0.35 : 0.8))
    if (n === 'petted') {
      pet.heartT -= dt
      if (pet.heartT <= 0) {
        const h = headWorld()
        spawnHeart(h.x + rand(-12, 12) * S, h.y - 32 * S)
        pet.heartT = rand(0.45, 0.95)
      }
      if (pet.energy < 0.05 && time - pet.lastPet > 1.6) nextState()
      return
    }

    // follow the cursor when it lingers far away near the cat area
    followCheck -= dt
    const awake = n !== 'sleep' && n !== 'wake'
    const pActive = pointer.inside && time - pointer.lastMove < 2.5 && pointer.y > -260 && pointer.y < H + 40
    if (followCheck <= 0 && awake) {
      followCheck = 1.1
      const dx = pointer.x - cat.x
      const interruptible = n === 'stand' || n === 'sit' || n === 'watch' || (n === 'walk' && !state.data.follow) ||
        ((n === 'groom' || n === 'wash') && Math.random() < 0.25) || (n === 'lie' && Math.random() < 0.3)
      if (pActive && Math.abs(dx) > 150 * S && interruptible && Math.random() < 0.7) {
        const m = 70 * S
        goTo('walk', { follow: true, target: clamp(pointer.x - Math.sign(dx) * 58 * S, m, W - m) })
      }
    }
    if (n === 'walk' && state.data.follow && pActive) {
      const dx = pointer.x - cat.x
      if (Math.abs(dx) > 90 * S) state.data.target = clamp(pointer.x - Math.sign(dx) * 58 * S, 70 * S, W - 70 * S)
    }

    // turn to face the cursor when it is behind the cat
    if ((n === 'sit' || n === 'stand' || n === 'watch') && pActive) {
      const behind = Math.sign(pointer.x - cat.x) !== Math.sign(cat.faceT) && Math.abs(pointer.x - cat.x) > 45 * S
      faceFlipT = behind ? faceFlipT + dt : 0
      if (faceFlipT > 1.3) { cat.faceT *= -1; faceFlipT = 0 }
    }

    if (n === 'walk') {
      const dx = state.data.target - cat.x
      const dir = Math.sign(dx) || 1
      cat.faceT = dir
      const aligned = cat.face * dir > 0.75
      const want = aligned ? dir * Math.min(26, Math.abs(dx) / S * 1.5 + 2) : 0
      cat.vel += (want - cat.vel) * (1 - Math.exp(-dt * 3.2))
      if (Math.abs(dx) < 2 * S && Math.abs(cat.vel) < 6) {
        cat.vel = 0
        if (state.data.follow) { queue = []; setState('watch') } else nextState()
      }
    } else {
      cat.vel += (0 - cat.vel) * (1 - Math.exp(-dt * 6))
      if (state.t > state.dur) nextState()
    }
  }

  function animate(dt) {
    time += dt
    think(dt)

    // springs toward the behaviour target
    Object.assign(T, targetFor())
    for (const k in T) {
      const w = omegaFor(k)
      const a = w * w * (T[k] - P[k]) - 2 * w * V[k]
      V[k] += a * dt
      P[k] += V[k] * dt
    }
    // facing spring
    {
      const w = 9
      cat.faceV += (w * w * (cat.faceT - cat.face) - 2 * w * cat.faceV) * dt
      cat.face += cat.faceV * dt
      if (Math.abs(cat.face) < 0.04) cat.face = 0.04 * (Math.sign(cat.faceT) || 1)
    }
    cat.x += cat.vel * S * dt
    cat.x = clamp(cat.x, 50 * S, Math.max(50 * S, W - 50 * S))
    const sp = Math.abs(cat.vel)
    cat.walkW = clamp(sp / 13, 0, 1)
    cat.phase = (cat.phase + sp * 0.6 / 17 * dt) % 1
    tailPhase += dt * P.tailSpeed * TAU * (1 + cat.walkW * 0.3)

    const Q = { ...P }
    const n = state.name

    // ---- procedural overlays
    const br = Math.sin(time * TAU * P.breathHz)
    Q.rChest *= 1 + 0.022 * br
    Q.rHip *= 1 + 0.016 * br
    Q.chestY -= 0.5 * br
    Q.headY -= 0.35 * br

    if (cat.walkW > 0) {
      const ph = cat.phase * TAU * 2
      Q.hipY += cat.walkW * 1.4 * Math.sin(ph)
      Q.chestY += cat.walkW * 1.3 * Math.sin(ph + 1.2)
      Q.headY += cat.walkW * 0.8 * Math.sin(ph + 1.8)
    }
    if (n === 'groom') {
      const l = Math.sin(time * 8.5)
      Q.headY += 2.3 * l; Q.headRot += 5 * l
      Q.tongue *= 0.65 + 0.35 * Math.max(0, l)
    }

    // look at cursor (or wander)
    const hw = headWorld()
    const pAct = pointer.inside && time - pointer.lastMove < 6
    if (time > look.nextIdle) {
      look.idleX = hw.x + rand(-180, 180) * S
      look.idleY = hw.y + rand(-90, 50) * S
      look.nextIdle = time + rand(1.5, 3.5)
    }
    const lx0 = pAct ? pointer.x : look.idleX
    const ly0 = pAct ? pointer.y : look.idleY
    const vx = (lx0 - hw.x) * (Math.sign(cat.face) || 1) / S
    const vy = (ly0 - hw.y) / S
    const vl = Math.hypot(vx, vy) || 1
    const springTo = (key, vkey, target, w) => {
      look[vkey] += (w * w * (target - look[key]) - 2 * w * look[vkey]) * dt
      look[key] += look[vkey] * dt
    }
    springTo('turn', 'turnV', clamp(vx / 90, -1, 1), 7)
    springTo('pitch', 'pitchV', clamp(vy / 90, -1, 1), 7)
    const reach = Math.min(1, vl / 45)
    springTo('px', 'pxV', (vx / vl) * 2.1 * reach * P.lookW, 13)
    springTo('py', 'pyV', (vy / vl) * 1.8 * reach * P.lookW, 13)
    // curious head tilt
    if (time > look.nextTilt) {
      look.tiltT = look.tiltT ? 0 : (Math.random() < 0.5 ? -1 : 1) * rand(8, 15)
      look.nextTilt = time + (look.tiltT ? rand(1.2, 2.2) : rand(4, 10))
    }
    springTo('tilt', 'tiltV', look.tiltT * P.lookW * (n === 'walk' ? 0 : 1), 5)

    const turn = lerp(P.stateTurn, look.turn, P.lookW)
    const pitch = look.pitch * P.lookW
    Q.headRot += P.lookW * (look.turn * 5) + look.tilt
    Q.headX += look.turn * 1.5 * P.lookW
    Q.headY += pitch * 2.2 * P.lookW

    // pupil dilation from fast cursor motion nearby
    let pupilT = P.pupil
    if (pAct && pointer.speed > 600 && Math.hypot(pointer.x - hw.x, pointer.y - hw.y) < 260 * S) pupilT = Math.max(pupilT, 5.2)
    look.pupil = look.pupil == null ? pupilT : lerp(look.pupil, pupilT, 1 - Math.exp(-dt * 4))

    // blinking (incl. affectionate slow blink when the cursor rests nearby)
    blink.slowCooldown -= dt
    const near = pAct && Math.hypot(pointer.x - hw.x, pointer.y - hw.y) < 220 * S
    if (blink.t < 0 && near && time - pointer.lastMove > 2.2 && blink.slowCooldown <= 0 && P.eyeOpen > 0.7) {
      blink.t = 0; blink.dur = 1.5; blink.slow = true; blink.slowCooldown = rand(6, 10)
    }
    if (blink.t < 0 && time > blink.next) {
      blink.t = 0; blink.dur = 0.16; blink.slow = false
      blink.next = time + (Math.random() < 0.2 ? 0.25 : rand(2.2, 5.5))
    }
    let bl = 0
    if (blink.t >= 0) {
      blink.t += dt
      const u = blink.t / blink.dur
      if (u >= 1) blink.t = -1
      else bl = blink.slow ? (u < 0.35 ? smooth(u / 0.35) * 0.88 : u < 0.6 ? 0.88 : 0.88 * (1 - smooth((u - 0.6) / 0.4))) : Math.sin(Math.PI * u)
    }
    const eyeOpen = clamp(P.eyeOpen * (1 - bl), 0, 1)

    // ear twitches
    if (time > ears.next) {
      if (Math.random() < 0.5) ears.lv += rand(-260, -160); else ears.rv += rand(-260, -160)
      ears.next = time + rand(2.5, 7)
    }
    {
      const w = 16
      ears.lv += (w * w * (0 - ears.l) - 2 * w * ears.lv * 0.6) * dt; ears.l += ears.lv * dt
      ears.rv += (w * w * (0 - ears.r) - 2 * w * ears.rv * 0.6) * dt; ears.r += ears.rv * dt
    }

    // meow mouth
    let mouthV = P.mouth
    if (meow.t >= 0) {
      meow.t += dt
      if (meow.t < 0.55) mouthV = Math.max(mouthV, Math.sin(Math.PI * meow.t / 0.55) * 0.9)
      if (meow.t > 1.5) meow.t = -1
    }

    /* ---------------------------------------------------- render */
    const s = S
    catG.setAttribute('transform', `translate(${f1(cat.x)},${f1(groundY())}) scale(${f2(cat.face * s)},${s})`)
    const purr = P.purr
    jitterG.setAttribute('transform', purr > 0.02 ? `translate(0,${f2(purr * 0.4 * Math.sin(time * 72))})` : '')

    // shadow
    const minX = Math.min(Q.hipX - Q.rHip, Q.headX - 26), maxX = Math.max(Q.chestX + Q.rChest, Q.headX + 26, Q.fNx)
    const sw = toWorld((minX + maxX) / 2, 0)
    shadow.setAttribute('cx', f1(sw.x))
    shadow.setAttribute('cy', f1(groundY() + 0.5 * s))
    shadow.setAttribute('rx', f1(((maxX - minX) / 2 + 4) * s))
    shadow.setAttribute('ry', f1(4.5 * s))

    // body
    const hx = Q.hipX, hy = Q.hipY, cx = Q.chestX, cy = Q.chestY
    hipC.setAttribute('cx', f1(hx)); hipC.setAttribute('cy', f1(hy)); hipC.setAttribute('r', f1(Q.rHip))
    chestC.setAttribute('cx', f1(cx)); chestC.setAttribute('cy', f1(cy)); chestC.setAttribute('r', f1(Q.rChest))
    bellyC.setAttribute('cx', f1((hx + cx) / 2)); bellyC.setAttribute('cy', f1((hy + cy) / 2 + 2.5))
    bellyC.setAttribute('r', f1((Q.rHip + Q.rChest) / 2 * 0.98))
    {
      const dx = cx - hx, dy = cy - hy, d = Math.hypot(dx, dy) || 1
      const nx = -dy / d, ny = dx / d
      bodyConn.setAttribute('points', [
        [hx + nx * Q.rHip, hy + ny * Q.rHip], [cx + nx * Q.rChest, cy + ny * Q.rChest],
        [cx - nx * Q.rChest, cy - ny * Q.rChest], [hx - nx * Q.rHip, hy - ny * Q.rHip],
      ].map((p) => f1(p[0]) + ',' + f1(p[1])).join(' '))
      const ang = Math.atan2(dy, dx) * 180 / Math.PI
      sheen.setAttribute('transform', `translate(${f1((hx + cx) / 2 - nx * 6)},${f1((hy + cy) / 2 - ny * 4 - 3)}) rotate(${f1(ang)})`)
      sheen.setAttribute('rx', f1(d / 2 + 6)); sheen.setAttribute('ry', 6)
    }
    neck.setAttribute('x1', f1(cx)); neck.setAttribute('y1', f1(cy))
    neck.setAttribute('x2', f1(Q.headX)); neck.setAttribute('y2', f1(Q.headY + 6))

    haunch.setAttribute('transform', `translate(${f1(hx + Q.hauX)},${f1(hy + Q.hauY)}) rotate(${f1(Q.hauRot)})`)
    haunch.setAttribute('rx', f1(Q.hauRx)); haunch.setAttribute('ry', f1(Q.hauRy))

    // legs
    const ww = cat.walkW
    const g = (off) => { const r = gait((cat.phase + off) % 1); return { dx: r.dx * ww, dy: r.dy * ww } }
    const gHN = g(0), gFN = g(0.25), gHF = g(0.5), gFF = g(0.75)
    const hb = clamp(Q.hindBend, 0, 1)
    let hpx = lerp(-1, 0.45, hb), hpy = lerp(0.2, -1, hb)

    // front near — with paw-wash override
    let fnx = Q.fNx + gFN.dx, fny = Q.fNy + gFN.dy
    if (P.washW > 0.01) {
      const per = 2.3, u = (time % per) / per
      let lx, ly
      if (u < 0.38) { // lick paw
        lx = 7; ly = 17 + Math.sin(u / 0.38 * TAU * 2) * 1.5
        Q.headRot += 7 + 3 * Math.sin(u / 0.38 * TAU * 2)
        Q.tongue = Math.max(Q.tongue, 0.8 + 0.2 * Math.sin(u / 0.38 * TAU * 4))
      } else { // wipe over face & ear
        const v = (u - 0.38) / 0.62, th = Math.PI / 2 - TAU * smooth(v)
        lx = 13 + 7 * Math.cos(th); ly = 1 + 16 * Math.sin(th)
        Q.headRot += -9 * Math.sin(Math.PI * v)
      }
      const r = Q.headRot * Math.PI / 180
      lx *= HEAD_SCALE; ly *= HEAD_SCALE
      const wx = Q.headX + lx * Math.cos(r) - ly * Math.sin(r)
      const wy = Q.headY + lx * Math.sin(r) + ly * Math.cos(r) + 4
      fnx = lerp(fnx, wx, P.washW); fny = lerp(fny, wy, P.washW)
    }
    const shY = cy + Q.shoulderDy
    const kFN = ik(cx + 2, shY, fnx, fny - 4, LF, LF, -0.3, 1)
    const kFF = ik(cx - 4, shY, Q.fFx + gFF.dx, Q.fFy + gFF.dy - 4, LF, LF, -0.3, 1)
    const kHN = ik(hx + 2, hy + 4, Q.hNx + gHN.dx, Q.hNy + gHN.dy - 4, LH, LH + 0.5, hpx, hpy)
    const kHF = ik(hx - 4, hy + 4, Q.hFx + gHF.dx, Q.hFy + gHF.dy - 4, LH, LH + 0.5, hpx, hpy)
    legFN.setAttribute('d', legPath(cx + 2, shY, kFN))
    legFF.setAttribute('d', legPath(cx - 4, shY, kFF))
    legHN.setAttribute('d', legPath(hx + 2, hy + 4, kHN))
    legHF.setAttribute('d', legPath(hx - 4, hy + 4, kHF))
    const paw = (e, k, fwd) => { e.setAttribute('cx', f1(k.ex + fwd)); e.setAttribute('cy', f1(k.ey + 0.6)) }
    paw(pawFF, kFF, 2.5); paw(pawHF, kHF, 2.5 + hb * 1.5); paw(pawHN, kHN, 2.5 + hb * 1.5)
    const ww2 = P.washW
    pawFNg.setAttribute('transform', `translate(${f1(kFN.ex + 2.5 * (1 - ww2))},${f1(kFN.ey + 0.6)}) rotate(${f1(-70 * ww2)})`)
    beans.setAttribute('opacity', f2(clamp(ww2 * 1.4 - 0.3, 0, 1)))

    // tail
    const wantFront = P.tailFront > 0.5
    if (wantFront !== tailInFront) {
      (wantFront ? tailFrontL : tailBackL).appendChild(tailG)
      // a faint rim keeps the wrapped tail readable over the black body
      tailG.setAttribute('stroke', wantFront ? '#3a3844' : C_BODY)
      tailInFront = wantFront
    }
    buildTail(Q, hx - Q.rHip * 0.82, hy - Q.rHip * 0.2)

    // head
    headG.setAttribute('transform', `translate(${f1(Q.headX)},${f1(Q.headY)}) rotate(${f1(Q.headRot)}) scale(${HEAD_SCALE})`)
    {
      // bell swings with head motion, walking and purring
      const kick = (Q.headRot - bell.prevRot) * -1.2
      bell.prevRot = Q.headRot
      const w = 11
      bell.v += (w * w * (0 - bell.a) - 2 * w * 0.25 * bell.v) * dt + kick * 8
      bell.a += bell.v * dt
      const ang = bell.a + cat.walkW * 14 * Math.sin(cat.phase * TAU * 2) + P.purr * 4 * Math.sin(time * 40)
      bellG.setAttribute('transform', `translate(2,28.5) rotate(${f1(clamp(ang, -45, 45))})`)
    }
    faceG.setAttribute('transform', `translate(${f2(turn * 4)},${f2(pitch * 1.6)})`)
    const earBase = P.earBack * 28
    earL.setAttribute('transform', `translate(${f2(turn * 1.5)},0) rotate(${f1(-(earBase + ears.l * 0.1 + (meow.t >= 0 ? -6 : 0)))} -16 -19)`)
    earR.setAttribute('transform', `translate(${f2(-turn * 1.5)},0) rotate(${f1(-(earBase + ears.r * 0.1 + (meow.t >= 0 ? -6 : 0)))} -16 -19)`)
    const ob = smooth(clamp((eyeOpen - 0.08) / 0.2, 0, 1))
    const curve = lerp(3.8, -4.2, clamp(P.happy, 0, 1))
    for (const e of eyes) {
      e.open.setAttribute('transform', `scale(1,${f2(Math.max(0.06, eyeOpen))})`)
      e.open.setAttribute('opacity', f2(ob))
      e.closed.setAttribute('opacity', f2(1 - ob))
      e.closed.setAttribute('d', `M-7,1 Q0,${f1(curve * 1.25 + 1)} 7,1`)
      e.pupil.setAttribute('cx', f2(look.px * 1.15))
      e.pupil.setAttribute('cy', f2(look.py * 1.15))
      e.pupil.setAttribute('rx', f2(look.pupil * 1.45))
      e.pupil.setAttribute('ry', f2(look.pupil * 1.55))
      e.hl.setAttribute('cx', f2(-3.2 + look.px * 0.25))
    }
    blushL.setAttribute('opacity', f2(0.35 + P.blush * 0.65))
    blushR.setAttribute('opacity', f2(0.35 + P.blush * 0.65))
    mouthOpen.setAttribute('ry', f2(Math.max(0, mouthV) * 4.2))
    mouthOpen.setAttribute('cy', f2(14 + mouthV * 1.5))
    const tg = Math.max(0, Q.tongue)
    tongue.setAttribute('ry', f2(tg * 3.2 + Math.max(0, mouthV) * 1.6))
    tongue.setAttribute('cy', f2(14.5 + tg * 2.2 + mouthV * 2.6))

    // hit areas
    hitBody.setAttribute('cx', f1((hx + cx) / 2)); hitBody.setAttribute('cy', f1((hy + cy) / 2))
    hitBody.setAttribute('r', f1(Math.hypot(cx - hx, cy - hy) / 2 + 17))
    hitHead.setAttribute('cx', f1(Q.headX)); hitHead.setAttribute('cy', f1(Q.headY - 4))
    hitHead.setAttribute('r', 34)

    // sleep zzz
    if (n === 'sleep') {
      zzzT -= dt
      if (zzzT <= 0) { const h = headWorld(); spawnZ(h.x + 18 * s * Math.sign(cat.face), h.y - 30 * s); zzzT = 1.7 }
    }
    updateParticles(dt)

    // meow bubble
    if (meow.t >= 0) {
      const h = headWorld()
      const u = meow.t / 1.5
      const a = u < 0.12 ? u / 0.12 : u > 0.75 ? 1 - (u - 0.75) / 0.25 : 1
      bubbleText.textContent = meow.text
      const w = meow.text.length * 11 + 16
      bubbleRect.setAttribute('x', -w / 2); bubbleRect.setAttribute('y', -11)
      bubbleRect.setAttribute('width', w); bubbleRect.setAttribute('height', 22)
      const bx = clamp(h.x + 26 * s * Math.sign(cat.face), w / 2 + 2, W - w / 2 - 2)
      bubbleG.setAttribute('transform', `translate(${f1(bx)},${f1(h.y - 50 * s - u * 6)}) scale(${f2(Math.min(1, 0.6 + u * 4))})`)
      bubbleG.setAttribute('opacity', f2(a))
    } else bubbleG.setAttribute('opacity', 0)
  }

  /* ----------------------------------------------------- run control */
  let raf = 0, last = 0, visible = true, destroyed = false
  function frame(ts) {
    raf = 0
    if (destroyed) return
    const dt = last ? Math.min(0.05, (ts - last) / 1000) : 1 / 60
    last = ts
    // substep for spring stability
    const steps = dt > 0.02 ? 2 : 1
    for (let i = 0; i < steps; i++) animate(dt / steps)
    if (visible) raf = requestAnimationFrame(frame)
  }
  function start() { if (!raf && !destroyed) { last = 0; raf = requestAnimationFrame(frame) } }

  const ro = new ResizeObserver(() => {
    W = container.clientWidth || W
    H = container.clientHeight || H
  })
  ro.observe(container)
  const io = new IntersectionObserver((ents) => {
    visible = ents[0]?.isIntersecting ?? true
    if (visible) start()
  })
  io.observe(container)

  setState('sit')
  state.dur = 2
  animate(0.0001)
  start()

  return {
    /** force a behaviour: 'walk' | 'stand' | 'sit' | 'groom' | 'wash' | 'lie' | 'sleep' | 'stretch' | 'petted' */
    play(name) {
      if (name === 'petted') { pet.energy = 2; pet.lastPet = time; startPetted(); return }
      goTo(name)
    },
    meow() { doMeow(); burst(1) },
    get state() { return state.name },
    setGlow(v) { opt.glow = v; applyGlow() },
    destroy() {
      destroyed = true
      if (raf) cancelAnimationFrame(raf)
      ro.disconnect(); io.disconnect(); mo.disconnect()
      window.removeEventListener('pointermove', onWindowMove)
      document.removeEventListener('pointerleave', onWindowLeave)
      svg.remove()
    },
  }
}
