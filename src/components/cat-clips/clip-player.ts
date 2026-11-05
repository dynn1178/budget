/**
 * ClipCat — "살아있는 펫" 클립 플레이어
 *
 * AI로 만든 짧은 동작 클립들을 상태 그래프에 따라 이어 재생한다.
 * 모든 클립은 "허브 포즈"(예: sit, sleep)에서 시작하고 허브 포즈에서 끝나므로,
 * 다음 클립으로 넘어갈 때 같은 프레임끼리 맞물려 이음새가 보이지 않는다.
 *
 * 각 클립은 scripts/cat-clips/process_clip.py 로 만든 "색상(위) + 알파(아래)" 세로 합본 MP4.
 * WebGL로 합성하므로 사파리 포함 모든 브라우저에서 투명 배경으로 보인다.
 *
 * 인터랙션: 고양이를 쓰다듬으면(마우스/손가락으로 문지르기) 하트가 나오고 'pet' 클립으로 전환.
 * 숨바꼭질: 가끔 바닥선 아래로 쏙 숨었다가, 귀 끝 → 눈 순서로 눈치 보며 올라온다.
 *          (영상 없이 코드로 연출 — 숨어 있는 자리에 마우스를 대면 빨리 빼꼼)
 */

export type Hub = string

export interface ClipDef {
  id: string
  src: string
  from: Hub
  to: Hub
  /** idle: 평소 대기 / action: 그루밍 등 / pet: 쓰다듬기 반응 / sleep: 잠자는 루프 / transition: 허브 이동 */
  kind: 'idle' | 'action' | 'pet' | 'sleep' | 'transition'
  weight?: number
  /** 이 클립으로 들어올 때 / 나갈 때 크로스페이드(초). 허브 프레임과 자세가 많이 다른 클립에 사용 */
  fadeIn?: number
  fadeOut?: number
}

export interface CatManifest {
  startHub: Hub
  /** 색상 프레임 크기(px) — 비율 계산용 */
  frame: { w: number; h: number }
  /** 쓰다듬기 영역 (프레임 기준 0~1 비율의 타원) */
  hit?: { cx: number; cy: number; rx: number; ry: number }
  /** 하트가 나오는 위치 (프레임 기준 0~1) */
  heartAt?: { x: number; y: number }
  /** 바닥 밑으로 숨기/빼꼼 연출 (영상 없이 코드로). 값은 '아래로 내려간 비율'(0 = 그대로, 1 = 완전히 숨음) */
  hide?: {
    /** 허브(앉은 자세)에서 클립이 끝날 때마다 숨을 확률 (기본 0.12) */
    chance?: number
    /** 귀 끝만 보이는 위치 (기본 0.85) */
    earsAt?: number
    /** 눈까지 보이는 위치 (기본 0.5) */
    eyesAt?: number
    /** 빼꼼할 때 번갈아 멈춰 보여줄 idle 클립의 시각(초) — 눈을 뜨고 여기저기 보는 프레임 */
    glance?: number[]
  }
  clips: ClipDef[]
}

export interface ClipCatOptions {
  /** 표시 가로 크기(px). 세로는 프레임 비율로 자동 */
  width?: number
  /** 상태 변경 콜백(디버그/표시용) */
  onClip?: (clip: ClipDef) => void
}

export interface ClipCatHandle {
  /** 강제로 특정 클립 재생 (데모용) */
  play(id: string): void
  /** 바닥 밑으로 숨기 (데모용) */
  hide(): void
  /** 숨어 있으면 바로 빼꼼 올라오기 (데모용) */
  peek(): void
  readonly clip: string
  destroy(): void
}

type Slot = { def: ClipDef; video: HTMLVideoElement; tex: WebGLTexture | null }

const VERT = `attribute vec2 p; varying vec2 v;
void main(){ v = vec2((p.x + 1.0) * 0.5, 1.0 - (p.y + 1.0) * 0.5); gl_Position = vec4(p, 0.0, 1.0); }`
const FRAG = `precision mediump float; varying vec2 v;
uniform sampler2D ta; uniform sampler2D tb; uniform float mixv; uniform float off;
vec4 samp(sampler2D t){
  float y = v.y - off;                     // 아래로 내려가며 바닥선(캔버스 아래 끝)에서 잘림
  if (y < 0.0 || y > 1.0) return vec4(0.0);
  vec3 c = texture2D(t, vec2(v.x, y * 0.5)).rgb;
  float a = texture2D(t, vec2(v.x, 0.5 + y * 0.5)).r;
  a = smoothstep(0.06, 0.94, a);           // 압축 노이즈 정리
  return vec4(c * a, a);                   // premultiplied
}
void main(){ gl_FragColor = mix(samp(ta), samp(tb), mixv); }`

const rand = (a: number, b: number) => a + Math.random() * (b - a)

export function createClipCat(container: HTMLElement, manifest: CatManifest, options: ClipCatOptions = {}): ClipCatHandle {
  const W = options.width ?? 200
  const H = Math.round((W * manifest.frame.h) / manifest.frame.w)
  const hit = manifest.hit ?? { cx: 0.5, cy: 0.58, rx: 0.32, ry: 0.4 }
  const heartAt = manifest.heartAt ?? { x: 0.5, y: 0.18 }

  /* ---------------------------------------------------------------- DOM */
  const root = document.createElement('div')
  Object.assign(root.style, { position: 'relative', width: W + 'px', height: H + 'px', pointerEvents: 'none' })
  const canvas = document.createElement('canvas')
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = Math.round(W * dpr)
  canvas.height = Math.round(H * dpr)
  Object.assign(canvas.style, { width: '100%', height: '100%', display: 'block', opacity: '0', transition: 'opacity .4s ease' })
  const hitEl = document.createElement('div')
  Object.assign(hitEl.style, {
    position: 'absolute', left: `${(hit.cx - hit.rx) * 100}%`, top: `${(hit.cy - hit.ry) * 100}%`,
    width: `${hit.rx * 200}%`, height: `${hit.ry * 200}%`, borderRadius: '50%',
    pointerEvents: 'auto', cursor: 'grab', touchAction: 'none',
  })
  hitEl.setAttribute('aria-label', '고양이 쓰다듬기')
  const fx = document.createElement('div')
  Object.assign(fx.style, { position: 'absolute', inset: '0', pointerEvents: 'none', overflow: 'visible' })
  root.append(canvas, hitEl, fx)
  container.appendChild(root)

  /* -------------------------------------------------------------- WebGL */
  const gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false })
  let prog: WebGLProgram | null = null
  let uMix: WebGLUniformLocation | null = null
  let uOff: WebGLUniformLocation | null = null
  if (gl) {
    const sh = (type: number, src: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s); return s }
    prog = gl.createProgram()!
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT))
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG))
    gl.linkProgram(prog)
    gl.useProgram(prog)
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(prog, 'p')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    gl.uniform1i(gl.getUniformLocation(prog, 'ta'), 0)
    gl.uniform1i(gl.getUniformLocation(prog, 'tb'), 1)
    uMix = gl.getUniformLocation(prog, 'mixv')
    uOff = gl.getUniformLocation(prog, 'off')
    gl.clearColor(0, 0, 0, 0)
  }
  const newTex = () => {
    if (!gl) return null
    const t = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, t)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    return t
  }

  /* ------------------------------------------------------------- videos */
  const slots = new Map<string, Slot>()
  const slotFor = (def: ClipDef): Slot => {
    let s = slots.get(def.id)
    if (!s) {
      const v = document.createElement('video')
      v.muted = true; v.playsInline = true; v.preload = 'auto'
      v.setAttribute('muted', ''); v.setAttribute('playsinline', '')
      v.src = def.src
      s = { def, video: v, tex: newTex() }
      slots.set(def.id, s)
    }
    return s
  }
  // 시작 허브에서 나가는 클립은 미리 받아둔다
  for (const c of manifest.clips) if (c.from === manifest.startHub) slotFor(c).video.load()

  /* ---------------------------------------------------------- scheduler */
  let cur: Slot | null = null
  let pending: { slot: Slot; fade: number } | null = null
  let fading: { from: Slot; to: Slot; t: number; dur: number } | null = null
  let lastAction = ''
  let awakeSince = performance.now()
  let sleepLoopsLeft = 0

  const pet = { energy: 0, lastMove: -1e9, lastX: 0, lastY: 0, has: false, heartT: 0 }
  const petting = () => pet.energy > 0.5 || performance.now() - pet.lastMove < 900

  const from = (hub: Hub, kind?: ClipDef['kind']) =>
    manifest.clips.filter((c) => c.from === hub && (!kind || c.kind === kind))
  const pickWeighted = (list: ClipDef[]) => {
    const tot = list.reduce((s, c) => s + (c.weight ?? 1), 0)
    let r = Math.random() * tot
    for (const c of list) { r -= c.weight ?? 1; if (r <= 0) return c }
    return list[list.length - 1]
  }

  function chooseNext(hub: Hub): ClipDef {
    // 숨어 있거나 빼꼼 중에는 두리번(idle)만
    if (hide.mode !== 'normal') {
      const idles = from(hub, 'idle')
      if (idles.length) return pickWeighted(idles)
    }
    const sleeps = from(hub, 'sleep')
    // 잠자는 중
    if (sleeps.length) {
      if (petting() || sleepLoopsLeft <= 0) {
        const wake = from(hub, 'transition')
        if (wake.length) return pickWeighted(wake)
      }
      sleepLoopsLeft--
      return pickWeighted(sleeps)
    }
    // 쓰다듬는 중
    if (petting()) {
      const pets = from(hub, 'pet')
      if (pets.length) return pickWeighted(pets)
    }
    const awakeFor = (performance.now() - awakeSince) / 1000
    const options: ClipDef[] = []
    for (const c of from(hub)) {
      if (c.kind === 'pet') continue
      if (c.kind === 'transition') {
        // 깨어 있은 지 오래될수록 잠들 확률 ↑
        if (awakeFor < 35) continue
        options.push({ ...c, weight: (c.weight ?? 1) * Math.min(1.5, (awakeFor - 35) / 60) })
        continue
      }
      if (c.kind === 'action' && c.id === lastAction) continue // 같은 행동 연속 방지
      options.push(c)
    }
    return pickWeighted(options.length ? options : from(hub))
  }

  function queue(def: ClipDef, fade = 0) {
    const slot = slotFor(def)
    const v = slot.video
    v.currentTime = 0
    void v.play().catch(() => {})
    pending = { slot, fade }
    // 다음에 이어질 수 있는 클립 미리 로드
    for (const c of from(def.to)) slotFor(c).video.preload = 'auto'
  }

  function commit(slot: Slot) {
    if (cur && cur !== slot) cur.video.pause()
    cur = slot
    canvas.style.opacity = '1' // first frame is ready → fade in
    const d = slot.def
    if (d.kind === 'action') lastAction = d.id
    if (d.kind === 'transition' && from(d.to, 'sleep').length) sleepLoopsLeft = Math.round(rand(5, 10))
    if (d.kind === 'transition' && !from(d.to, 'sleep').length) awakeSince = performance.now()
    options.onClip?.(d)
  }

  /* ------------------------------------------------ hide & peek (코드 연출) */
  type Ease = 'in' | 'out' | 'inout' | 'back'
  type Step = { to: number; dur: number; ease: Ease; hold?: number }
  const ease = (e: Ease, x: number) => {
    if (e === 'in') return x * x * x
    if (e === 'out') return 1 - (1 - x) ** 3
    if (e === 'inout') return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2
    const c1 = 1.70158, c3 = c1 + 1
    return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2
  }
  const hideCfg = { chance: 0.12, earsAt: 0.85, eyesAt: 0.5, glance: [0, 0.4, 0.8] as number[], ...(manifest.hide ?? {}) }
  const hide = {
    mode: 'normal' as 'normal' | 'hiding' | 'hidden' | 'peeking',
    off: 0, from: 0, steps: [] as Step[], t: 0, done: null as null | (() => void),
    hiddenLeft: 0, peeks: 0, hoverAt: 0,
    glancing: false, nextGlance: 0, gi: 0,
  }
  const run = (steps: Step[], done: () => void) => {
    hide.from = hide.off; hide.steps = steps; hide.t = 0; hide.done = done
  }
  function startHide() {
    hide.mode = 'hiding'; hide.peeks = 0
    hitEl.style.cursor = 'default'
    // 살짝 움찔(위로) → 쏙 내려가기
    run([{ to: -0.03, dur: 0.14, ease: 'out' }, { to: 1.03, dur: 0.38, ease: 'in' }], () => {
      hide.mode = 'hidden'; hide.hiddenLeft = rand(3, 7)
      // 안 보이는 동안 두리번(idle) 클립으로 바꿔 두고, 빼꼼할 때 눈 뜬 프레임만 골라 보여준다
      const idle = from(manifest.startHub, 'idle')[0]
      if (idle && cur?.def.id !== idle.id) queue(idle)
      hide.glancing = true; hide.nextGlance = 0
    })
  }
  function startPeek() {
    hide.mode = 'peeking'
    run([
      { to: hideCfg.earsAt, dur: 0.55, ease: 'out', hold: rand(0.6, 1.1) },        // 귀 끝만 쫑긋
      { to: hideCfg.eyesAt, dur: 0.5, ease: 'out', hold: rand(1.2, 2.2) },         // 눈까지 빼꼼, 두리번
    ], () => {
      if (hide.peeks < 2 && Math.random() < 0.35) {
        // 놀라서 다시 쏙
        hide.peeks++
        run([{ to: 1.03, dur: 0.22, ease: 'in' }], () => { hide.mode = 'hidden'; hide.hiddenLeft = rand(1.5, 3) })
      } else {
        // 조심조심 올라와서 원래 자리로
        hide.glancing = false
        if (cur) void cur.video.play().catch(() => {})
        run([
          { to: hideCfg.eyesAt * 0.55, dur: 0.45, ease: 'inout', hold: 0.45 },
          { to: 0, dur: 0.65, ease: 'back' },
        ], () => { hide.mode = 'normal'; hide.off = 0; hitEl.style.cursor = 'grab'; awakeSince = performance.now() })
      }
    })
  }
  function updateHide(dt: number) {
    if (hide.glancing && cur && cur.def.kind === 'idle' && !pending) {
      const v = cur.video
      if (!v.paused) v.pause()
      const now = performance.now()
      if (now >= hide.nextGlance) {
        const g = hideCfg.glance
        v.currentTime = g[hide.gi++ % g.length]
        hide.nextGlance = now + rand(550, 1100) // 눈치 보듯 불규칙하게 시선 이동
      }
    }
    if (hide.mode === 'hidden') {
      hide.hiddenLeft -= dt
      if (hide.hoverAt && performance.now() - hide.hoverAt > 350) hide.hiddenLeft = Math.min(hide.hiddenLeft, 0)
      if (hide.hiddenLeft <= 0) { hide.hoverAt = 0; startPeek() }
      return
    }
    const st = hide.steps[0]
    if (!st) return
    hide.t += dt
    const k = Math.min(1, hide.t / st.dur)
    hide.off = hide.from + (st.to - hide.from) * ease(st.ease, k)
    if (hide.t >= st.dur + (st.hold ?? 0)) {
      hide.steps.shift(); hide.from = st.to; hide.off = st.to; hide.t = 0
      if (!hide.steps.length) { const d = hide.done; hide.done = null; d?.() }
    }
  }

  /* --------------------------------------------------------- petting UI */
  function spawnHeart(big = false) {
    const h = document.createElement('div')
    h.textContent = '♥'
    const x = heartAt.x * W + rand(-W * 0.12, W * 0.12)
    const y = heartAt.y * H
    Object.assign(h.style, {
      position: 'absolute', left: x + 'px', top: y + 'px', color: ['#ff7d9c', '#ff94b0', '#ff6f91'][(Math.random() * 3) | 0],
      fontSize: (big ? 18 : 14) + 'px', lineHeight: '1', transform: 'translate(-50%,-50%)', textShadow: '0 1px 2px rgba(0,0,0,.15)',
    })
    fx.appendChild(h)
    const dx = rand(-14, 14)
    h.animate([
      { transform: 'translate(-50%,-50%) scale(.4)', opacity: 0 },
      { transform: 'translate(-50%,-90%) scale(1.1)', opacity: 1, offset: 0.2 },
      { transform: `translate(calc(-50% + ${dx}px), -${H * 0.35}px) scale(.9)`, opacity: 0 },
    ], { duration: rand(1300, 1900), easing: 'ease-out' }).onfinish = () => h.remove()
  }
  const onMove = (e: PointerEvent) => {
    if (hide.mode !== 'normal') {
      if (hide.mode === 'hidden' && !hide.hoverAt) hide.hoverAt = performance.now()
      return
    }
    if (pet.has) {
      const d = Math.min(40, Math.hypot(e.clientX - pet.lastX, e.clientY - pet.lastY))
      pet.energy = Math.min(3, pet.energy + d * 0.012)
      pet.lastMove = performance.now()
    }
    pet.has = true; pet.lastX = e.clientX; pet.lastY = e.clientY
  }
  const onLeave = () => { pet.has = false }
  const onDown = (e: PointerEvent) => {
    if (hide.mode !== 'normal') { if (hide.mode === 'hidden') hide.hiddenLeft = 0; return }
    hitEl.setPointerCapture?.(e.pointerId)
    hitEl.style.cursor = 'grabbing'
    pet.energy = Math.min(3, pet.energy + 0.3)
    pet.lastMove = performance.now()
    spawnHeart(true)
  }
  const onUp = () => { hitEl.style.cursor = 'grab' }
  hitEl.addEventListener('pointermove', onMove)
  hitEl.addEventListener('pointerleave', onLeave)
  hitEl.addEventListener('pointerdown', onDown)
  hitEl.addEventListener('pointerup', onUp)

  /* --------------------------------------------------------------- loop */
  let raf = 0, last = performance.now(), visible = true, destroyed = false
  const upload = (s: Slot, unit: number) => {
    if (!gl || !s.tex) return
    gl.activeTexture(unit === 0 ? gl.TEXTURE0 : gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, s.tex)
    if (s.video.readyState >= 2) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, s.video)
  }

  function frame(now: number) {
    raf = 0
    if (destroyed) return
    const dt = Math.min(0.1, (now - last) / 1000)
    last = now

    updateHide(dt)
    // 쓰다듬기 에너지
    pet.energy = Math.max(0, pet.energy - dt * 0.45)
    if (petting() && hide.mode === 'normal') {
      pet.heartT -= dt
      if (pet.heartT <= 0) { spawnHeart(); pet.heartT = rand(0.45, 0.9) }
      // 앉아 있는 중이면 행복 클립으로 빠르게 전환 (짧은 크로스페이드)
      if (cur && !pending && !fading && cur.def.kind !== 'pet' && cur.def.from === cur.def.to && from(cur.def.from, 'sleep').length === 0) {
        const pets = from(cur.def.from, 'pet')
        const v = cur.video
        if (pets.length && v.duration - v.currentTime > 0.6) queue(pickWeighted(pets), 0.35)
      }
    }

    // 현재 클립이 끝나갈 때 다음 클립 시작 (같은 허브 프레임에서 이어짐)
    if (cur && !pending && !fading) {
      const v = cur.video
      if (v.ended || (v.duration > 0 && v.currentTime >= v.duration - 0.06)) {
        // 앉은 자세로 돌아온 순간, 가끔 바닥 밑으로 숨기
        const atRest = from(cur.def.to, 'sleep').length === 0 && from(cur.def.to, 'idle').length > 0
        if (atRest && hide.mode === 'normal' && !petting() && (performance.now() - awakeSince) / 1000 > 12 && Math.random() < hideCfg.chance) startHide()
        const nx = chooseNext(cur.def.to)
        queue(nx, Math.max(cur.def.fadeOut ?? 0, nx.fadeIn ?? 0))
      }
    }
    // 다음 클립의 첫 프레임이 준비되면 교체 (그 전까지는 이전 클립의 마지막 프레임 유지)
    if (pending) {
      const nv = pending.slot.video
      if (nv.readyState >= 2 && nv.currentTime > 0) {
        if (pending.fade > 0 && cur) fading = { from: cur, to: pending.slot, t: 0, dur: pending.fade }
        else commit(pending.slot)
        pending = null
      }
    }
    let mixv = 0
    if (fading) {
      fading.t += dt
      mixv = Math.min(1, fading.t / fading.dur)
      if (mixv >= 1) { commit(fading.to); fading = null; mixv = 0 }
    }

    if (gl && prog && cur) {
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.clear(gl.COLOR_BUFFER_BIT)
      upload(fading ? fading.from : cur, 0)
      if (fading) upload(fading.to, 1)
      else { gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, (fading ? null : cur.tex)) }
      gl.uniform1f(uMix, mixv)
      gl.uniform1f(uOff, hide.off)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }
    if (visible) raf = requestAnimationFrame(frame)
  }

  function startClip(def: ClipDef) {
    queue(def)
  }
  const io = new IntersectionObserver((ents) => {
    visible = ents[0]?.isIntersecting ?? true
    for (const s of slots.values()) if (!visible) s.video.pause()
    if (visible) {
      if (cur && !cur.video.ended) void cur.video.play().catch(() => {})
      if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame) }
    }
  })
  io.observe(root)

  const first = from(manifest.startHub, 'idle')[0] ?? manifest.clips[0]
  startClip(first)
  raf = requestAnimationFrame(frame)

  return {
    play(id) {
      const def = manifest.clips.find((c) => c.id === id)
      if (def) queue(def, 0.3)
    },
    hide() { if (hide.mode === 'normal') startHide() },
    peek() { if (hide.mode === 'hidden') hide.hiddenLeft = 0 },
    get clip() { return hide.mode === 'normal' ? (cur?.def.id ?? '') : hide.mode },
    destroy() {
      destroyed = true
      if (raf) cancelAnimationFrame(raf)
      io.disconnect()
      for (const s of slots.values()) { s.video.pause(); s.video.removeAttribute('src'); s.video.load(); if (gl && s.tex) gl.deleteTexture(s.tex) }
      gl?.getExtension('WEBGL_lose_context')?.loseContext()
      root.remove()
    },
  }
}
