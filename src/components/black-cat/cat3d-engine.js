/**
 * Black Cat 3D — real-time three.js pet kitten for a page footer.
 *
 * Same behaviour brain as the SVG engine (spring-blended poses, IK legs,
 * state machine), rendered in 3D: metaball body for a seamless plush shape,
 * velvet "sheen" fur with a warm back-rim light, glossy eyeballs that roll to
 * follow the cursor, a metallic bell. A small canvas follows the cat, so the
 * GPU cost stays tiny even on wide footers.
 *
 * Behaviours: walk · stand · sit · groom · wash(paw face-wash) · lie · sleep ·
 *             stretch(yawn) · petted(purr) · watch/follow cursor
 */
import * as THREE from 'three'
import { MarchingCubes } from 'three/addons/objects/MarchingCubes.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'

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
    hipX: -19, hipY: -35, chestX: 13, chestY: -37, rHip: 15.5, rChest: 14.5,
    headX: 28, headY: -68, headRot: 0, shoulderDy: 4, hindBend: 0,
    fNx: 15, fNy: 0, fFx: 8, fFy: 0, hNx: -17, hNy: 0, hFx: -24, hFy: 0,
    hauX: -1, hauY: 2, hauRx: 12.5, hauRy: 13.5, hauRot: 12,
    tailBase: 0.55, tailCurl: 0.07, tailTip: 0.3, tailSway: 0.12, tailSpeed: 0.9, tailFront: 0,
  },
  sit: {
    hipX: -11, hipY: -17, chestX: 0, chestY: -40, rHip: 16.5, rChest: 13,
    headX: 4, headY: -79, headRot: 0, shoulderDy: 4, hindBend: 1,
    fNx: 15, fNy: 0, fFx: 15, fFy: 0, hNx: 8, hNy: 0, hFx: 8, hFy: 0,
    hauX: 1, hauY: 3, hauRx: 15, hauRy: 13, hauRot: -8,
    tailBase: -0.25, tailCurl: 0.2, tailTip: 0.34, tailSway: 0.06, tailSpeed: 0.5, tailFront: 0,
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
    hipX: -18, hipY: -38, chestX: 10, chestY: -19, rHip: 14.5, rChest: 12.5,
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

const LF = 17.5 // front leg bone length
const LH = 16 // hind leg bone length

const MEOWS = ['냐옹~', '냥!', '미야옹', '냐아~', '먀!']

/* ============================================================== engine */
export function createBlackCat3D(container, options = {}) {
  const opt = { size: 1, glow: 'auto', interactive: true, ...options }
  const S = opt.size

  /* ------------------------------------------------- overlay (fx/hit) */
  const svg = el('svg', { class: 'black-cat-fx', 'aria-hidden': 'true' })
  Object.assign(svg.style, {
    position: 'absolute', inset: '0', width: '100%', height: '100%',
    overflow: 'visible', pointerEvents: 'none', userSelect: 'none', zIndex: 2,
  })

  /* ---------------------------------------------------------- renderer */
  // A small canvas follows the cat (cheap to render, lets ears/hearts overflow).
  const CW = Math.round(240 * S), CH = Math.round(185 * S), PAD_B = Math.round(16 * S)
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.setSize(CW, CH, false)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.08
  const canvas = renderer.domElement
  Object.assign(canvas.style, {
    position: 'absolute', left: '0', top: '0', width: CW + 'px', height: CH + 'px',
    pointerEvents: 'none', willChange: 'transform', zIndex: 1,
  })
  container.appendChild(canvas)
  container.appendChild(svg)

  const scene = new THREE.Scene()
  const pmrem = new THREE.PMREMGenerator(renderer)
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environment = envTex
  scene.environmentIntensity = 0.42
  const camera = new THREE.OrthographicCamera(-CW / 2, CW / 2, CH - PAD_B, -PAD_B, -2000, 2000)
  camera.position.set(0, 0, 800)
  camera.lookAt(0, 0, 0)

  // soft studio light: warm key, cool fill, strong warm back-rim (like the reference)
  scene.add(new THREE.HemisphereLight(0xe9e7ff, 0x5e4a3e, 1.15))
  const key = new THREE.DirectionalLight(0xfff0de, 2.6); key.position.set(-70, 130, 160); scene.add(key)
  const rim = new THREE.DirectionalLight(0xffcf9a, 4.2); rim.position.set(110, 70, -160); scene.add(rim)
  const rim2 = new THREE.DirectionalLight(0xb7c3ff, 1.8); rim2.position.set(-150, 40, -90); scene.add(rim2)

  /* --------------------------------------------------------- materials */
  const furParams = { color: 0x252125, roughness: 0.86, specularIntensity: 0.35, sheen: 1, sheenRoughness: 0.5, sheenColor: 0x8c7d74 }
  const M = {
    fur: new THREE.MeshPhysicalMaterial(furParams),
    furLight: new THREE.MeshPhysicalMaterial({ ...furParams, color: 0x2d2a2f }),
    nose: new THREE.MeshPhysicalMaterial({ color: 0xe6857c, roughness: 0.28, clearcoat: 0.6 }),
    mouth: new THREE.MeshStandardMaterial({ color: 0x0e090c, roughness: 0.6 }),
    mouthIn: new THREE.MeshStandardMaterial({ color: 0x6a2233, roughness: 0.5 }),
    tongue: new THREE.MeshPhysicalMaterial({ color: 0xff97a9, roughness: 0.3, clearcoat: 0.4 }),
    mark: new THREE.MeshPhysicalMaterial({ color: 0xf6f0ec, roughness: 0.75, sheen: 1, sheenColor: 0xffffff, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 }),
    collar: new THREE.MeshPhysicalMaterial({ color: 0xe5566a, roughness: 0.42, clearcoat: 0.5, sheen: 0.4, sheenColor: 0xffb0b8 }),
    bell: new THREE.MeshStandardMaterial({ color: 0xf3c247, metalness: 1, roughness: 0.2 }),
    bellSlot: new THREE.MeshStandardMaterial({ color: 0x5c3b06, metalness: 0.6, roughness: 0.5 }),
    bean: new THREE.MeshPhysicalMaterial({ color: 0xf5a0b1, roughness: 0.45 }),
    sparkle: new THREE.MeshBasicMaterial({ color: 0xffffff }),
    closedEye: new THREE.MeshStandardMaterial({ color: 0xded7e6, roughness: 0.5, transparent: true }),
    whisker: new THREE.LineBasicMaterial({ color: 0xf1ecf6, transparent: true, opacity: 0.75 }),
  }

  // shell fur: the same mesh drawn in N slightly inflated layers, each keeping
  // fewer "strands" (object-space hash) → soft, fluffy silhouette.
  function furShell(base, k, len, density, face = 0) {
    const m = base.clone()
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uK = { value: k }
      sh.uniforms.uLen = { value: len }
      sh.uniforms.uDen = { value: density }
      sh.uniforms.uFace = { value: face }
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uK; uniform float uLen; uniform float uFace; varying vec3 vFurP; varying float vFace;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFurP = position;\nvFace = uFace * smoothstep(11.0, 17.0, position.z) * (1.0 - smoothstep(16.0, 21.0, length((position.xy - vec2(0.0, -6.0)) * vec2(0.85, 1.0))));\ntransformed += normalize(objectNormal) * uK * uLen * (1.0 - 0.8 * vFace);\ntransformed.y -= uK * uK * uLen * 0.3;')
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform float uK; uniform float uDen; varying vec3 vFurP; varying float vFace;\nfloat furH(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }')
        .replace('#include <color_fragment>', '#include <color_fragment>\nif (vFace > 0.5 || furH(floor(vFurP * uDen)) < uK) discard;\ndiffuseColor.rgb *= mix(0.62, 1.25, uK);')
    }
    m.customProgramCacheKey = () => 'fur' + k.toFixed(3) + face
    return m
  }
  const addShells = (parent, geo, base, n, len, density, face = 0) => {
    for (let i = 1; i <= n; i++) {
      const sh = new THREE.Mesh(geo, furShell(base, i / (n + 1), len, density, face))
      sh.frustumCulled = false
      parent.add(sh)
    }
  }

  // iris texture (planar-mapped onto the eyeball so circles stay round)
  const irisCanvas = document.createElement('canvas')
  irisCanvas.width = irisCanvas.height = 256
  const irisTex = new THREE.CanvasTexture(irisCanvas)
  irisTex.colorSpace = THREE.SRGBColorSpace
  irisTex.anisotropy = 4
  let irisDrawn = -1
  function drawIris(pupil) {
    const c = irisCanvas.getContext('2d')
    const C = 128, R = 122
    c.fillStyle = '#2a1a05'; c.fillRect(0, 0, 256, 256)
    // warm yellow iris, paler low-centre, deeper amber toward the rim
    let g = c.createRadialGradient(C, C + 30, 8, C, C, R)
    g.addColorStop(0, '#fae27a'); g.addColorStop(0.45, '#f6d03e'); g.addColorStop(0.85, '#f0c030'); g.addColorStop(0.96, '#d9a020'); g.addColorStop(1, '#7a5008')
    c.fillStyle = g; c.beginPath(); c.arc(C, C, R, 0, TAU); c.fill()
    // fine iris fibres
    c.save(); c.beginPath(); c.arc(C, C, R - 6, 0, TAU); c.clip()
    for (let i = 0; i < 140; i++) {
      const an = (i / 140) * TAU + Math.sin(i * 12.9898) * 0.03
      const r0 = 40 + (i % 5) * 4, r1 = R - 10 - (i % 7) * 3
      c.strokeStyle = i % 3 ? 'rgba(255,248,200,0.10)' : 'rgba(150,90,10,0.10)'
      c.lineWidth = i % 3 ? 1.1 : 1.6
      c.beginPath(); c.moveTo(C + Math.cos(an) * r0, C + Math.sin(an) * r0); c.lineTo(C + Math.cos(an) * r1, C + Math.sin(an) * r1); c.stroke()
    }
    // soft shadow cast by the upper lid
    g = c.createLinearGradient(0, C - R, 0, C + R * 0.1)
    g.addColorStop(0, 'rgba(60,28,0,0.55)'); g.addColorStop(0.45, 'rgba(60,28,0,0.18)'); g.addColorStop(1, 'rgba(60,28,0,0)')
    c.fillStyle = g; c.fillRect(0, 0, 256, 256)
    c.restore()
    // dark limbal ring
    c.lineWidth = 5; c.strokeStyle = 'rgba(60,34,4,0.75)'; c.beginPath(); c.arc(C, C, R - 3, 0, TAU); c.stroke()
    // pupil
    const pr = clamp(pupil * 17, 54, 96)
    const PY = C - 9 // pupil sits a little high → yellow crescent below (gazing up)
    g = c.createRadialGradient(C - 8, PY - 10, 4, C, PY, pr)
    g.addColorStop(0, '#3a2414'); g.addColorStop(0.55, '#1a0f07'); g.addColorStop(0.92, '#0c0603'); g.addColorStop(1, 'rgba(40,22,6,0.9)')
    c.fillStyle = g; c.beginPath(); c.arc(C, PY, pr, 0, TAU); c.fill()
    // faint warm bounce light in the lower pupil
    g = c.createRadialGradient(C + 10, PY + pr * 0.55, 2, C + 10, PY + pr * 0.55, pr * 0.6)
    g.addColorStop(0, 'rgba(255,190,90,0.10)'); g.addColorStop(1, 'rgba(255,190,90,0)')
    c.fillStyle = g; c.beginPath(); c.arc(C, PY, pr, 0, TAU); c.fill()
    irisTex.needsUpdate = true
    irisDrawn = pupil
  }
  drawIris(3.9)
  M.eye = new THREE.MeshPhysicalMaterial({ map: irisTex, emissiveMap: irisTex, emissive: 0xffffff, emissiveIntensity: 0.42, roughness: 0.55, clearcoat: 0.35, clearcoatRoughness: 0.35, envMapIntensity: 0.08 })
  M.lid = new THREE.MeshPhysicalMaterial({ ...furParams, color: 0x19161a })

  const radialTex = (inner, outer) => {
    const cv = document.createElement('canvas'); cv.width = cv.height = 64
    const c = cv.getContext('2d'); const g = c.createRadialGradient(32, 32, 0, 32, 32, 32)
    g.addColorStop(0, inner); g.addColorStop(1, outer); c.fillStyle = g; c.fillRect(0, 0, 64, 64)
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t
  }
  M.blush = new THREE.MeshBasicMaterial({ map: radialTex('rgba(255,120,150,0.85)', 'rgba(255,120,150,0)'), transparent: true, depthWrite: false })
  M.shadow = new THREE.MeshBasicMaterial({ map: radialTex('rgba(0,0,0,0.55)', 'rgba(0,0,0,0)'), transparent: true, depthWrite: false })

  /* ------------------------------------------------------------- rig */
  const root = new THREE.Group()       // at the cat's ground point, tilted toward the camera
  root.rotation.x = 0.2
  root.scale.setScalar(S)
  scene.add(root)
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), M.shadow)
  shadow.rotation.x = -Math.PI / 2
  shadow.position.y = 0.3
  shadow.renderOrder = -1
  root.add(shadow)
  const yawG = new THREE.Group()       // body orientation (turns in 3D)
  root.add(yawG)

  // body = metaballs → one soft seamless shape
  const LOW_POWER = window.matchMedia?.('(pointer: coarse)').matches ?? false
  let frameNo = 0
  const MC_RES = 32, MC_B = 116, MC_C = new THREE.Vector3(-4, 46, 0), MC_ZS = 0.82
  const body = new MarchingCubes(MC_RES, M.fur, false, false, 40000)
  body.isolation = 80
  body.position.copy(MC_C)
  body.scale.set(MC_B / 2, MC_B / 2, (MC_B / 2) * MC_ZS)
  yawG.add(body)
  addShells(body, body.geometry, M.fur, 6, 1.7 / (MC_B / 2), 2.2 * (MC_B / 2)) // object space of the MC box
  const ball = (x, y, z, r) => {
    const s = (r / MC_B) ** 2 * (body.isolation + 12)
    body.addBall((x - MC_C.x) / MC_B + 0.5, (y - MC_C.y) / MC_B + 0.5, (z / MC_ZS - MC_C.z) / MC_B + 0.5, s, 12)
  }

  // legs: capsule bones + paws
  const mkLeg = (rU, rL, len) => {
    const up = new THREE.Mesh(new THREE.CapsuleGeometry(rU, len, 6, 14), M.fur)
    const lo = new THREE.Mesh(new THREE.CapsuleGeometry(rL, len, 6, 14), M.fur)
    const paw = new THREE.Mesh(new THREE.SphereGeometry(6, 20, 14), M.fur)
    paw.scale.set(1.2, 0.74, 1.05)
    const beans = new THREE.Group()
    const bg = new THREE.SphereGeometry(1, 10, 8)
    for (const [x, z, r] of [[0, 0.6, 2.3], [-2.9, -2.2, 1.1], [0, -3.2, 1.1], [2.9, -2.2, 1.1]]) {
      const b = new THREE.Mesh(bg, M.bean); b.position.set(x, -5.15, z); b.scale.set(r, r * 0.5, r); beans.add(b)
    }
    beans.visible = false
    paw.add(beans)
    yawG.add(up, lo, paw)
    addShells(up, up.geometry, M.fur, 4, 1.4, 2.6)
    addShells(lo, lo.geometry, M.fur, 4, 1.2, 2.6)
    return { up, lo, paw, beans }
  }
  const legs = {
    FN: mkLeg(5.6, 5.0, LF), FF: mkLeg(5.6, 5.0, LF),
    HN: mkLeg(5.8, 4.8, LH), HF: mkLeg(5.8, 4.8, LH),
  }
  const LEG_Z = 5.6

  // tail: tapered tube rebuilt every frame
  const TN = 12, TR = 12
  const TRINGS = TN + 1 + 2
  const tailGeo = new THREE.BufferGeometry()
  const tailPos = new Float32Array(TRINGS * TR * 3)
  tailGeo.setAttribute('position', new THREE.BufferAttribute(tailPos, 3))
  {
    const idx = []
    for (let i = 0; i < TRINGS - 1; i++) for (let j = 0; j < TR; j++) {
      const a = i * TR + j, b = i * TR + (j + 1) % TR, c = (i + 1) * TR + j, d = (i + 1) * TR + (j + 1) % TR
      idx.push(a, c, b, b, c, d)
    }
    tailGeo.setIndex(idx)
  }
  const tail = new THREE.Mesh(tailGeo, M.fur)
  tail.frustumCulled = false
  yawG.add(tail)
  addShells(tail, tailGeo, M.fur, 7, 3.0, 2.2)

  /* ------------------------------------------------------------ head */
  const headG = new THREE.Group()   // position + orientation
  yawG.add(headG)
  const headInner = new THREE.Group() // purr / features
  headInner.scale.setScalar(1.17)
  headG.add(headInner)
  const sstep = (a, b, t) => smooth(clamp((t - a) / (b - a), 0, 1))
  const headGeo = new THREE.SphereGeometry(1, 56, 40)
  {
    const p = headGeo.attributes.position
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i)
      const cheek = Math.exp(-((y + 0.15) ** 2) / 0.08) // fluff band at eye level
      const chin = sstep(-0.45, -1, y)
      let X = x * 26.5 * (1 + 0.1 * cheek - 0.18 * chin)
      let Y = y * 24 * (y < 0 ? 1.0 : 0.97)
      let Z = z * 23 * (1 - 0.1 * chin)
      if (z > 0) Z *= 1 - 0.08 * z * z
      p.setXYZ(i, X, Y, Z)
    }
    headGeo.computeVertexNormals()
  }
  const headMesh = new THREE.Mesh(headGeo, M.fur)
  headInner.add(headMesh)
  addShells(headMesh, headGeo, M.fur, 9, 2.6, 2.6, 1)
  // puffy muzzle + chin
  const muzzleGeo = new THREE.SphereGeometry(4.2, 24, 18)
  const muzL = new THREE.Mesh(muzzleGeo, M.fur); muzL.position.set(-2.6, -10.4, 17.6); muzL.scale.set(1, 0.75, 0.62)
  const muzR = muzL.clone(); muzR.position.x = 2.6
  const chin = new THREE.Mesh(new THREE.SphereGeometry(3.6, 20, 14), M.fur); chin.position.set(0, -14, 15.2); chin.scale.set(1, 0.7, 0.6)
  headInner.add(muzL, muzR, chin)
  headInner.updateMatrixWorld(true)

  const ray = new THREE.Raycaster()
  const surf = (x, y, objs = [headMesh, muzL, muzR, chin]) => {
    ray.set(new THREE.Vector3(x, y, 200), new THREE.Vector3(0, 0, -1))
    const hit = ray.intersectObjects(objs, false)[0]
    if (!hit) return { p: new THREE.Vector3(x, y, 20), n: new THREE.Vector3(0, 0, 1) }
    const n = hit.face.normal.clone().transformDirection(hit.object.matrixWorld)
    return { p: hit.point.clone(), n }
  }
  const place = (obj, x, y, off = 0, objs) => {
    const { p, n } = surf(x, y, objs)
    obj.position.copy(p).addScaledVector(n, off)
    obj.lookAt(p.clone().addScaledVector(n, off + 10))
    return { p, n }
  }

  // ears: half-lathe "scoop" (concave toward the front) with a rounded tip
  const earProfile = (R, H) => {
    const pts = []
    for (let i = 0; i <= 24; i++) {
      const t = i / 24
      const r = R * Math.pow(1 - t, 0.82) * (1 + 0.12 * Math.sin(Math.PI * t)) + (t > 0.9 ? 0 : 0)
      pts.push(new THREE.Vector2(Math.max(r, 0.01), t * H))
    }
    pts.push(new THREE.Vector2(0.01, H + 0.6))
    return pts
  }
  const earOuterGeo = new THREE.LatheGeometry(earProfile(15, 32), 36, Math.PI / 2 - 0.75, Math.PI + 1.5) // wraps forward → dark rim
  const earInnerGeo = new THREE.LatheGeometry(earProfile(11.6, 25), 30, Math.PI / 2 - 0.25, Math.PI + 0.5)
  {
    // pink gradient: deeper in the centre/base, lighter toward the rim and tip
    const p = earInnerGeo.attributes.position, col = []
    const deep = new THREE.Color(0xd9625f), light = new THREE.Color(0xf6a892), tmp = new THREE.Color()
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i)
      const r = Math.hypot(x, z) || 1
      const centre = Math.max(0, -z / r) // 1 at the back of the scoop
      const k = clamp(0.15 + 0.6 * (1 - centre) + 0.35 * (y / 24), 0, 1)
      tmp.copy(deep).lerp(light, k)
      col.push(tmp.r, tmp.g, tmp.b)
    }
    earInnerGeo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
  }
  M.earIn = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.62, sheen: 0.5, sheenColor: 0xffd0d0, side: THREE.BackSide })
  M.earOut = new THREE.MeshPhysicalMaterial({ ...furParams, side: THREE.DoubleSide })
  M.earWisp = new THREE.MeshStandardMaterial({ color: 0xe9e2ea, roughness: 0.8, transparent: true, opacity: 0.55, depthWrite: false })
  const wispGeo = new THREE.ConeGeometry(0.6, 9, 6)
  const ears3 = [-1, 1].map((sd) => {
    const pivot = new THREE.Group()
    pivot.position.set(sd * 14, 12, -1.5)
    const shape = new THREE.Group()
    shape.scale.set(1, 1, 0.62)
    const outer = new THREE.Mesh(earOuterGeo, M.earOut)
    addShells(outer, earOuterGeo, M.fur, 6, 1.6, 2.6)
    const inner = new THREE.Mesh(earInnerGeo, M.earIn)
    inner.position.set(0, 2.2, 0.6)
    shape.add(outer, inner)
    // light fur wisps inside, near the outer edge of the ear
    for (const [x, y, rz, l] of [[sd * 7.5, 4, sd * 0.5, 1], [sd * 8.5, 7, sd * 0.65, 0.85], [sd * 6.5, 2.5, sd * 0.3, 0.9], [sd * 9, 10, sd * 0.8, 0.7]]) {
      const w = new THREE.Mesh(wispGeo, M.earWisp)
      w.position.set(x * 0.85, y + 4, 2.4)
      w.rotation.set(0.25, 0, rz)
      w.scale.set(1, l, 1)
      shape.add(w)
    }
    pivot.add(shape)
    pivot.rotation.set(0.12, sd * -0.22, sd * -0.44)
    headInner.add(pivot)
    return { pivot, sd, base: pivot.rotation.z }
  })

  // eyes: eyeball set under fur lids (lids close for blinks), flat catch-lights
  const EYE_R = 7.7
  const eyeGeo = new THREE.SphereGeometry(EYE_R, 40, 30)
  {
    const p = eyeGeo.attributes.position, uv = eyeGeo.attributes.uv
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / (EYE_R * 2) + 0.5, p.getY(i) / (EYE_R * 2) + 0.5)
  }
  const lidGeo = new THREE.SphereGeometry(EYE_R * 1.015, 40, 16, 0, TAU, 0, Math.PI / 2)
  const closedGeo = new THREE.TorusGeometry(6.6, 0.75, 8, 28, Math.PI * 0.72)
  const hlGeo = new THREE.CircleGeometry(1, 24)
  const eyes3 = [-1, 1].map((sd) => {
    const g = new THREE.Group()
    place(g, sd * 12.8, -4.8, -2.2, [headMesh])
    const socket = new THREE.Group()
    socket.scale.set(1.04, 1, 0.4)
    const ball = new THREE.Mesh(eyeGeo, M.eye)
    const upper = new THREE.Mesh(lidGeo, M.lid)
    const lower = new THREE.Mesh(lidGeo, M.lid)
    lower.rotation.z = Math.PI // cap now covers y <= 0
    const lowerPivot = new THREE.Group(); lowerPivot.add(lower)
    const h1 = new THREE.Mesh(hlGeo, M.sparkle); h1.position.set(-1.9, 1.4, EYE_R * 1.03); h1.scale.setScalar(1.6)
    const h2 = new THREE.Mesh(hlGeo, M.sparkle); h2.position.set(2.3, -2.9, EYE_R * 1.03); h2.scale.setScalar(0.5)
    socket.add(ball, upper, lowerPivot, h1, h2)
    g.add(socket)
    const closed = new THREE.Mesh(closedGeo, M.closedEye)
    closed.position.set(0, 0, 4.6)
    g.add(closed)
    headInner.add(g)
    return { g, socket, ball, upper, lowerPivot, closed, sparks: [h1, h2] }
  })

  // nose, mouth, tongue, whiskers, blush
  const nose = new THREE.Mesh(new THREE.SphereGeometry(2.0, 18, 12), M.nose)
  nose.scale.set(1.3, 0.8, 0.7)
  place(nose, 0, -7.8, 0.5)
  headInner.add(nose)
  {
    const pts = []
    const add = (x, y) => { const { p, n } = surf(x, y); pts.push(p.addScaledVector(n, 0.3)) }
    for (const sd of [-1, 1]) {
      const c = []
      for (const [x, y] of [[0, -9.3], [0, -10.8], [sd * 1.1, -12], [sd * 2.4, -12.1], [sd * 3.6, -11.2]]) { const { p, n } = surf(x, y); c.push(p.addScaledVector(n, 0.35)) }
      const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(c), 20, 0.34, 6), M.mouth)
      headInner.add(m)
    }
    void add
  }
  const mouthIn = new THREE.Mesh(new THREE.SphereGeometry(3.8, 18, 12), M.mouthIn)
  place(mouthIn, 0, -14.5, -0.6)
  headInner.add(mouthIn)
  const tongue3 = new THREE.Mesh(new THREE.SphereGeometry(2.8, 18, 12), M.tongue)
  place(tongue3, 0, -15, 0.2)
  headInner.add(tongue3)
  const mouthBase = mouthIn.position.clone(), tongueBase = tongue3.position.clone()
  {
    const v = []
    for (const sd of [-1, 1]) {
      for (const [y0, x1, y1] of [[-10.2, 38, -7.5], [-11.6, 39, -12.5], [-13, 35, -17.5]]) {
        const { p } = surf(sd * 8.5, y0)
        v.push(p.x, p.y, p.z + 0.3, sd * x1, y1, p.z - 7)
      }
    }
    const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(v, 3))
    headInner.add(new THREE.LineSegments(wg, M.whisker))
  }
  const blushes = [-1, 1].map((sd) => {
    const b = new THREE.Mesh(new THREE.PlaneGeometry(13, 8), M.blush.clone())
    place(b, sd * 19.5, -9.5, 0.35, [headMesh])
    headInner.add(b)
    return b
  })

  // collar + bell (on the neck, just below the big head)
  const COLLAR_R = 14
  const collar = new THREE.Mesh(new THREE.TorusGeometry(COLLAR_R, 2.1, 14, 56), M.collar)
  yawG.add(collar)
  const bellPivot = new THREE.Group()
  const bellMesh = new THREE.Mesh(new THREE.SphereGeometry(4.6, 24, 18), M.bell)
  bellMesh.position.y = -4.2
  const slot = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.7, 1.2), M.bellSlot)
  slot.position.set(0, -4.4, 4.3)
  const slot2 = new THREE.Mesh(new THREE.BoxGeometry(0.7, 2.6, 1.2), M.bellSlot)
  slot2.position.set(0, -6.2, 3.9)
  const loop = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.5, 6, 12), M.bell)
  loop.position.y = 0.4
  bellPivot.add(bellMesh, slot, slot2, loop)
  yawG.add(bellPivot)
  let bell = { a: 0, v: 0, prevRot: 0 }

  // hit areas (only these receive pointer events, rest of page stays clickable)
  const hitStyle = { fill: 'transparent', 'pointer-events': opt.interactive ? 'all' : 'none' }
  const hitBody = el('circle', hitStyle, svg)
  const hitHead = el('circle', hitStyle, svg)
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
  const _v = new THREE.Vector3(), _u = new THREE.Vector3(), _n = new THREE.Vector3()
  const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _e = new THREE.Euler()
  const UP = new THREE.Vector3(0, 1, 0)
  const project = (v) => ({ x: cat.x + v.x, y: groundY() - v.y })
  let headScreen = { x: 0, y: 0 }
  function headWorld() { return headScreen }
  function toWorld(lx, ly) { _v.set(lx, -ly, 0); yawG.localToWorld(_v); return project(_v) }

  function gait(p) {
    const beta = 0.6, stride = 17, lift = 5.5
    if (p < beta) return { dx: stride / 2 - stride * (p / beta), dy: 0 }
    const q = (p - beta) / (1 - beta)
    return { dx: -stride / 2 + stride * smooth(q), dy: -lift * Math.sin(Math.PI * q) }
  }

  // 3D two-bone IK; pole = preferred bend direction of the middle joint
  function ik3(R, T, a, b, pole) {
    _u.subVectors(T, R)
    const d = _u.length() || 0.001
    _u.divideScalar(d)
    const dc = clamp(d, Math.abs(a - b) + 0.5, a + b - 0.05)
    const end = R.clone().addScaledVector(_u, dc)
    const along = (a * a + dc * dc - b * b) / (2 * dc)
    const h = Math.sqrt(Math.max(0, a * a - along * along))
    _n.copy(pole).addScaledVector(_u, -pole.dot(_u))
    if (_n.lengthSq() < 1e-6) _n.set(0, 0, 1)
    _n.normalize()
    const knee = R.clone().addScaledVector(_u, along).addScaledVector(_n, h)
    if (knee.y < 3.5) knee.y = 3.5 // keep knee/elbow above ground
    return { knee, end }
  }
  function setBone(mesh, A, B) {
    mesh.position.addVectors(A, B).multiplyScalar(0.5)
    _u.subVectors(B, A).normalize()
    mesh.quaternion.setFromUnitVectors(UP, _u)
  }

  const tailPts = Array.from({ length: TRINGS }, () => new THREE.Vector3())
  const tailRad = new Float32Array(TRINGS)
  function buildTail3(Q, rootX, rootY, side) {
    const N = TN, seg = 5.2
    let x = rootX, y = rootY
    tailPts[0].set(x, -y, 0)
    const swayZ = clamp(Q.tailSway * 7, 0.25, 1)
    for (let i = 0; i < N; i++) {
      const u = i / N
      let a = Q.tailBase + Q.tailCurl * i
      if (i >= N - 6) a += Q.tailTip * 0.55 * (i - (N - 7))
      a += Q.tailSway * Math.sin(tailPhase - i * 0.42) * (0.35 + u * 1.3)
      x += -Math.cos(a) * seg
      y += -Math.sin(a) * seg
      if (y > -4) y = lerp(y, -4, 0.85) // rest on the ground
      const v = (i + 1) / N
      const z = clamp(Q.tailFront, 0, 1) * side * Math.pow(v, 1.3) * 16 + Math.sin(tailPhase * 0.6 - i * 0.35) * v * 4 * swayZ
      tailPts[i + 1].set(x, -y, z)
    }
    for (let i = 0; i <= N; i++) tailRad[i] = 4.6 + 2.2 * Math.sin(Math.PI * (0.12 + (i / N) * 0.7))
    // rounded tip
    _u.subVectors(tailPts[N], tailPts[N - 1]).normalize()
    const rt = tailRad[N]
    tailPts[N + 1].copy(tailPts[N]).addScaledVector(_u, rt * 0.6); tailRad[N + 1] = rt * 0.75
    tailPts[N + 2].copy(tailPts[N]).addScaledVector(_u, rt * 0.98); tailRad[N + 2] = 0.3
    const ref = new THREE.Vector3(0, 0, 1)
    const nn = new THREE.Vector3(), bb = new THREE.Vector3(), tt = new THREE.Vector3()
    let k = 0
    for (let i = 0; i < TRINGS; i++) {
      tt.subVectors(tailPts[Math.min(TRINGS - 1, i + 1)], tailPts[Math.max(0, i - 1)]).normalize()
      nn.crossVectors(tt, Math.abs(tt.z) > 0.9 ? UP : ref).normalize()
      bb.crossVectors(tt, nn)
      for (let j = 0; j < TR; j++) {
        const an = (j / TR) * TAU, c = Math.cos(an) * tailRad[i], s = Math.sin(an) * tailRad[i]
        tailPos[k++] = tailPts[i].x + nn.x * c + bb.x * s
        tailPos[k++] = tailPts[i].y + nn.y * c + bb.y * s
        tailPos[k++] = tailPts[i].z + nn.z * c + bb.z * s
      }
    }
    tailGeo.attributes.position.needsUpdate = true
    tailGeo.computeVertexNormals()
    tailGeo.computeBoundingSphere()
  }

  /* ------------------------------------------------------------ glow */
  function applyGlow() {
    let on = opt.glow === true
    if (opt.glow === 'auto') {
      const th = document.documentElement.getAttribute('data-theme')
      on = th ? th === 'dark' : window.matchMedia?.('(prefers-color-scheme: dark)').matches
    }
    canvas.style.filter = on ? 'drop-shadow(0 0 1.2px rgba(255,255,255,.5)) drop-shadow(0 0 7px rgba(190,200,255,.2))' : ''
    M.shadow.opacity = on ? 0.9 : 0.55
  }
  applyGlow()
  const mo = new MutationObserver(applyGlow)
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

  /* ------------------------------------------------------------- loop */
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
    const sgn = Math.sign(cat.face) || 1
    // 3/4 view toward the camera; a turn swings the body through facing the viewer
    const yaw = -0.34 - ((1 - cat.face) / 2) * (Math.PI - 0.68)
    yawG.rotation.y = yaw
    const purr = P.purr
    yawG.position.y = purr > 0.02 ? purr * 0.35 * Math.sin(time * 72) : 0
    canvas.style.transform = `translate(${f1(cat.x - CW / 2)}px,${f1(groundY() - (CH - PAD_B))}px)`

    const hx = Q.hipX, hy = -Q.hipY, cx = Q.chestX, cy = -Q.chestY // 3D: y up
    const hdx = Q.headX, hdy = -Q.headY

    // ---- body (metaballs)
    // phones: rebuild the body surface every other frame (it moves slowly)
    if (!LOW_POWER || (frameNo++ & 1) === 0) {
    body.reset()
    ball(hx, hy, 0, Q.rHip)
    ball(cx, cy, 0, Q.rChest)
    for (const t of [0.33, 0.66]) ball(lerp(hx, cx, t), lerp(hy, cy, t) - 1.5, 0, lerp(Q.rHip, Q.rChest, t) * 0.96)
    const hauR = ((Q.hauRx + Q.hauRy) / 2) * 0.74
    ball(hx + Q.hauX, hy - Q.hauY, 5.5, hauR)
    ball(hx + Q.hauX, hy - Q.hauY, -5.5, hauR)
    ball(lerp(cx, hdx, 0.45), lerp(cy, hdy, 0.45), 0, 9.5)
    ball(lerp(cx, hdx, 0.7), lerp(cy, hdy, 0.7), 0, 9) // visible neck
    ball(lerp(cx, hdx, 0.2) + 2, lerp(cy, hdy, 0.2), 0, 9) // chest fluff
    ball(cx + 1, cy - Q.shoulderDy + 3, 5, 7.5)
    ball(cx + 1, cy - Q.shoulderDy + 3, -5, 7.5)
    body.update()
    }

    // ---- paw-wash choreography (adjusts head before it is posed)
    let wash = null
    if (P.washW > 0.01) {
      const per = 2.3, u = (time % per) / per
      let lx, ly
      if (u < 0.38) { // lick paw
        lx = 7; ly = 17 + Math.sin((u / 0.38) * TAU * 2) * 1.5
        Q.headRot += 7 + 3 * Math.sin((u / 0.38) * TAU * 2)
        Q.tongue = Math.max(Q.tongue, 0.8 + 0.2 * Math.sin((u / 0.38) * TAU * 4))
      } else { // wipe over face & ear
        const v = (u - 0.38) / 0.62, th = Math.PI / 2 - TAU * smooth(v)
        lx = 12 + 7 * Math.cos(th); ly = 1 + 15 * Math.sin(th)
        Q.headRot += -9 * Math.sin(Math.PI * v)
      }
      wash = { lx, ly }
    }

    // ---- head
    headG.position.set(hdx, hdy, 0)
    const turnYaw = turn * lerp(1.0, 0.62, P.lookW) * sgn
    headG.rotation.set(pitch * 0.3, turnYaw - yaw, (-Q.headRot * sgn * Math.PI) / 180, 'YXZ')
    root.updateMatrixWorld(true)
    headG.getWorldPosition(_v)
    headScreen = project(_v)

    // ---- legs
    const ww = cat.walkW
    const g = (off) => { const r = gait((cat.phase + off) % 1); return { dx: r.dx * ww, dy: r.dy * ww } }
    const gHN = g(0), gFN = g(0.25), gHF = g(0.5), gFF = g(0.75)
    const hb = clamp(Q.hindBend, 0, 1)
    const poleF = new THREE.Vector3(-0.3, -1, 0)
    const poleH = new THREE.Vector3(lerp(-1, 0.45, hb), lerp(-0.2, 1, hb), 0)
    const shY = cy - Q.shoulderDy
    const washKey = sgn > 0 ? 'FN' : 'FF'
    const legDefs = {
      FN: { R: new THREE.Vector3(cx + 6, shY, LEG_Z), T: new THREE.Vector3(Q.fNx + gFN.dx, 4 - Q.fNy - gFN.dy, LEG_Z), L: LF, pole: poleF, fwd: 2.5 },
      FF: { R: new THREE.Vector3(cx + 6, shY, -LEG_Z), T: new THREE.Vector3(Q.fFx + gFF.dx, 4 - Q.fFy - gFF.dy, -LEG_Z), L: LF, pole: poleF, fwd: 2.5 },
      HN: { R: new THREE.Vector3(hx + 1, hy - 4, LEG_Z), T: new THREE.Vector3(Q.hNx + gHN.dx, 4 - Q.hNy - gHN.dy, LEG_Z), L: LH, pole: poleH, fwd: 2.5 + hb * 1.5 },
      HF: { R: new THREE.Vector3(hx + 1, hy - 4, -LEG_Z), T: new THREE.Vector3(Q.hFx + gHF.dx, 4 - Q.hFy - gHF.dy, -LEG_Z), L: LH, pole: poleH, fwd: 2.5 + hb * 1.5 },
    }
    if (wash) {
      _v.set(wash.lx * sgn, -wash.ly - 2, 22)
      headInner.localToWorld(_v)
      yawG.worldToLocal(_v)
      legDefs[washKey].T.lerp(_v, P.washW)
    }
    const ww2 = P.washW
    for (const k in legs) {
      const d = legDefs[k], lg = legs[k]
      const { knee, end } = ik3(d.R, d.T, d.L, d.L + (k[0] === 'H' ? 0.5 : 0), d.pole)
      setBone(lg.up, d.R, knee)
      setBone(lg.lo, knee, end)
      const isWash = k === washKey && ww2 > 0.01
      lg.paw.position.set(end.x + d.fwd * (isWash ? 1 - ww2 : 1), end.y - 0.6, end.z)
      if (isWash) {
        _q.setFromEuler(_e.set((-Math.PI / 2) * ww2, 0, 0))
        yawG.getWorldQuaternion(_q2)
        lg.paw.quaternion.copy(_q2.invert().multiply(_q))
        lg.beans.visible = ww2 > 0.4
      } else {
        lg.paw.quaternion.identity()
        lg.beans.visible = false
      }
    }

    // ---- tail
    buildTail3(Q, Q.hipX - Q.rHip * 0.82, Q.hipY - Q.rHip * 0.2, sgn)

    // ---- face
    const earDeg = P.earBack * 28 + (meow.t >= 0 ? -6 : 0)
    for (const e of ears3) {
      const tw = (e.sd < 0 ? ears.l : ears.r) * 0.1
      e.pivot.rotation.z = e.base - e.sd * ((earDeg + tw) * Math.PI / 180)
      e.pivot.rotation.x = 0.12 - P.earBack * 0.45
    }
    const ob = smooth(clamp((eyeOpen - 0.08) / 0.2, 0, 1))
    const happyArc = P.happy > 0.5
    for (const e of eyes3) {
      // upper lid rolls down over the eyeball; lower lid rises a little
      e.upper.rotation.x = lerp(-1.0, Math.PI / 2 + 0.02, 1 - eyeOpen)
      e.lowerPivot.rotation.x = lerp(1.5, 0.8, 1 - eyeOpen)
      for (const sp of e.sparks) sp.visible = eyeOpen > 0.45
      e.ball.rotation.set(look.py * 0.06, look.px * sgn * 0.07, 0)
      e.closed.visible = eyeOpen < 0.3
      e.closed.material.opacity = clamp(1 - eyeOpen / 0.3, 0, 1)
      e.closed.rotation.z = happyArc ? Math.PI * 0.14 : -Math.PI * 0.86
      e.closed.position.y = happyArc ? -3.4 : 3.2
    }
    if (Math.abs(look.pupil - irisDrawn) > 0.12) drawIris(look.pupil)
    for (const b of blushes) b.material.opacity = P.blush * 0.8
    const mv = Math.max(0, mouthV)
    mouthIn.visible = mv > 0.03
    mouthIn.scale.set(1, Math.max(0.05, mv) * 1.15, 0.5)
    mouthIn.position.copy(mouthBase).y -= mv * 1.4
    const tg = Math.max(0, Q.tongue)
    tongue3.visible = tg > 0.03 || mv > 0.25
    tongue3.scale.set(1, 0.35 + tg * 0.85 + mv * 0.35, 0.55)
    tongue3.position.copy(tongueBase)
    tongue3.position.y -= tg * 2.2 + mv * 2.2
    {
      // bell swings with head motion, walking and purring
      const kick = (Q.headRot - bell.prevRot) * -1.2
      bell.prevRot = Q.headRot
      const w = 11
      bell.v += (w * w * (0 - bell.a) - 2 * w * 0.25 * bell.v) * dt + kick * 8
      bell.a += bell.v * dt
      const ang = bell.a + cat.walkW * 14 * Math.sin(cat.phase * TAU * 2) + P.purr * 4 * Math.sin(time * 40)
      // collar ring around the neck axis, right under the head
      const ax = _u.set(hdx - cx, hdy - cy, 0).normalize().clone()
      collar.position.set(hdx - ax.x * 27, hdy - ax.y * 27, 0)
      collar.quaternion.setFromUnitVectors(_n.set(0, 0, 1), ax)
      collar.scale.set(1, 1, 1)
      // bell hangs on the camera-facing front of the ring
      const fr = new THREE.Vector3(0.75, -0.25, 0.65 * sgn)
      fr.addScaledVector(ax, -fr.dot(ax)).normalize()
      bellPivot.position.copy(collar.position).addScaledVector(fr, COLLAR_R + 1.8)
      _q.setFromAxisAngle(UP, -yaw)
      bellPivot.quaternion.copy(_q)
      bellPivot.rotateZ((-clamp(ang, -45, 45) * sgn * Math.PI) / 180)
    }

    // ---- shadow
    const minX = Math.min(Q.hipX - Q.rHip, Q.headX - 26), maxX = Math.max(Q.chestX + Q.rChest, Q.headX + 26, Q.fNx)
    _v.set((minX + maxX) / 2, 0, 0).applyAxisAngle(UP, yaw)
    shadow.position.set(_v.x, 0.3, _v.z)
    shadow.scale.set(maxX - minX + 22, 34, 1)

    renderer.render(scene, camera)

    // ---- hit areas
    const bc = toWorld((Q.hipX + Q.chestX) / 2, (Q.hipY + Q.chestY) / 2)
    hitBody.setAttribute('cx', f1(bc.x)); hitBody.setAttribute('cy', f1(bc.y))
    hitBody.setAttribute('r', f1((Math.hypot(Q.chestX - Q.hipX, Q.chestY - Q.hipY) / 2 + 17) * s))
    hitHead.setAttribute('cx', f1(headScreen.x)); hitHead.setAttribute('cy', f1(headScreen.y - 4 * s))
    hitHead.setAttribute('r', f1(34 * s))

    // sleep zzz
    if (n === 'sleep') {
      zzzT -= dt
      if (zzzT <= 0) { const h = headWorld(); spawnZ(h.x + 18 * s * sgn, h.y - 30 * s); zzzT = 1.7 }
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
      const bx = clamp(h.x + 30 * s * sgn, w / 2 + 2, W - w / 2 - 2)
      bubbleG.setAttribute('transform', `translate(${f1(bx)},${f1(h.y - 52 * s - u * 6)}) scale(${f2(Math.min(1, 0.6 + u * 4))})`)
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
      scene.traverse((o) => { if (o.geometry) o.geometry.dispose() })
      for (const k in M) M[k].dispose?.()
      irisTex.dispose(); envTex.dispose(); pmrem.dispose()
      renderer.dispose()
      canvas.remove(); svg.remove()
    },
  }
}

/** true when WebGL is available (use the SVG engine as a fallback otherwise) */
export function supportsWebGL() {
  try {
    const c = document.createElement('canvas')
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')))
  } catch { return false }
}
