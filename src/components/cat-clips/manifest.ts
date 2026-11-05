import type { CatManifest } from './clip-player'

/**
 * 클립 목록 (public/cat/clips/*.mp4)
 *
 * 허브 포즈
 *  - sit   : 앉아서 정면을 보는 기본 자세 (모든 sit 클립의 첫/마지막 프레임)
 *  - sleep : 몸을 말고 자는 자세
 *
 * 허브 프레임과 자세가 많이 다른 클립은 fadeIn/fadeOut(초)으로 재생 중 크로스페이드합니다.
 *
 * 새 클립을 추가하려면: 허브에서 시작·끝나도록 생성 → process_clip.py 로 변환 → 아래에 한 줄 추가.
 * 예) { id: 'sit_yawn', src: '/cat/clips/sit_yawn.mp4', from: 'sit', to: 'sit', kind: 'action' }
 */
const C = '/cat/clips/'

export const defaultCatManifest: CatManifest = {
  startHub: 'sit',
  // 원본보다 차분하게: 기본 0.7배, 빠른 동작은 클립별 0.85배
  speed: 0.7,
  // 우클릭으로 숨은 뒤 다시 나타나기까지 (초)
  hiddenFor: 180,
  frame: { w: 420, h: 282 },
  hit: { cx: 0.53, cy: 0.54, rx: 0.27, ry: 0.42 },
  heartAt: { x: 0.52, y: 0.1 },
  // 바닥 밑으로 숨기/빼꼼 (코드 연출): 귀 끝(프레임 위 8%)·눈(약 43%) 위치 기준
  hide: { chance: 0.06, earsAt: 0.85, eyesAt: 0.5 }, // 영상 숨바꼭질(cat_hide_peek)도 있으니 코드 연출은 가끔만
  clips: [
    // ── 평소 모습 (idle) ─────────────────────────────
    { id: 'sit_idle', src: C + 'sit_idle.mp4', from: 'sit', to: 'sit', kind: 'idle', weight: 2, label: '앉아서 두리번 (첫 영상)' },
    { id: 'cat_look_up', src: C + 'cat_look_up.mp4', from: 'sit', to: 'sit', kind: 'idle', weight: 2, label: '위를 올려다보며 두리번 (A)' },
    { id: 'cat_gaze', src: C + 'cat_gaze.mp4', from: 'sit', to: 'sit', kind: 'idle', weight: 2, label: '이리저리 시선 옮기기 (E)' },
    { id: 'cat_stare', src: C + 'cat_stare.mp4', from: 'sit', to: 'sit', kind: 'idle', weight: 1, fadeIn: 0.3, fadeOut: 0.3, label: '동그란 눈으로 정면 응시 (A)' },
    { id: 'cat_head_tilt', src: C + 'cat_head_tilt.mp4', from: 'sit', to: 'sit', kind: 'idle', weight: 1, fadeIn: 0.3, fadeOut: 0.3, label: '갸우뚱 (A)' },
    // ── 행동 (action) ────────────────────────────────
    { id: 'sit_wash', src: C + 'sit_wash.mp4', from: 'sit', to: 'sit', kind: 'action', weight: 0.6, fadeOut: 0.4, label: '앞발 그루밍 (첫 영상)' },
    { id: 'cat_yawn', src: C + 'cat_yawn.mp4', from: 'sit', to: 'sit', kind: 'action', weight: 1, fadeIn: 0.3, label: '하품 (A)' },
    { id: 'cat_paw_lick', src: C + 'cat_paw_lick.mp4', from: 'sit', to: 'sit', kind: 'action', weight: 1, fadeOut: 0.3, label: '앞발 핥기, 혀 쏙 (B)' },
    { id: 'cat_face_wash', src: C + 'cat_face_wash.mp4', from: 'sit', to: 'sit', kind: 'action', weight: 1, fadeIn: 0.3, fadeOut: 0.3, label: '앞발로 세수 (B)' },
    { id: 'cat_content', src: C + 'cat_content.mp4', from: 'sit', to: 'sit', kind: 'action', weight: 0.8, fadeIn: 0.3, fadeOut: 0.3, label: '눈 감고 기분 좋은 표정 (B)' },
    { id: 'cat_sneeze', src: C + 'cat_sneeze.mp4', from: 'sit', to: 'sit', kind: 'action', speed: 0.85, weight: 0.8, fadeIn: 0.3, label: '재채기 + 고개 털기 (B)' },
    { id: 'cat_meow', src: C + 'cat_meow.mp4', from: 'sit', to: 'sit', kind: 'action', speed: 0.85, weight: 1, fadeIn: 0.3, fadeOut: 0.3, label: '야옹 (C)' },
    { id: 'cat_startle', src: C + 'cat_startle.mp4', from: 'sit', to: 'sit', kind: 'action', speed: 0.85, weight: 0.6, fadeIn: 0.3, label: '깜짝 놀라 폴짝 (C)' },
    { id: 'cat_hide_peek', src: C + 'cat_hide_peek.mp4', from: 'sit', to: 'sit', kind: 'action', weight: 0.5, label: '살포시 숨었다가 빼꼼 (G)' },
    // ── 쓰다듬기 · 간식 ─────────────────────────────
    { id: 'pet', src: C + 'pet.mp4', from: 'sit', to: 'sit', kind: 'pet', fadeIn: 0.35, fadeOut: 0.35, label: '쓰다듬 반응 — 활짝 웃기 (첫 영상)' },
    { id: 'cat_pet_bliss', src: C + 'cat_pet_bliss.mp4', from: 'sit', to: 'sit', kind: 'pet', fadeOut: 0.3, label: '쓰다듬 반응 — 눈 감고 기대기 (C)' },
    { id: 'cat_treat', src: C + 'cat_treat.mp4', from: 'sit', to: 'sit', kind: 'treat', speed: 0.85, fadeIn: 0.3, label: '간식 먹기 — 발견 → 냠냠 → 입맛 (E)' },
    // ── 잠 ───────────────────────────────────────────
    { id: 'sit_to_sleep', src: C + 'sit_to_sleep.mp4', from: 'sit', to: 'sleep', kind: 'transition', label: '놀다가 잠들기 (첫 영상)' },
    { id: 'sleep_loop', src: C + 'sleep_loop.mp4', from: 'sleep', to: 'sleep', kind: 'sleep', label: '쿨쿨 (첫 영상)' },
    { id: 'sleep_to_sit', src: C + 'sleep_to_sit.mp4', from: 'sleep', to: 'sit', kind: 'transition', fadeOut: 0.4, label: '일어나기 (첫 영상)' },
    { id: 'cat_doze_off', src: C + 'cat_doze_off.mp4', from: 'sit', to: 'nap', kind: 'transition', label: '꾸벅꾸벅 졸다 엎드리기 (D)' },
    { id: 'cat_nap_loop', src: C + 'cat_nap_loop.mp4', from: 'nap', to: 'nap', kind: 'sleep', label: '엎드려 쌔근쌔근 (D)' },
    { id: 'cat_wake_yawn', src: C + 'cat_wake_yawn.mp4', from: 'nap', to: 'sit', kind: 'transition', fadeIn: 0.3, label: '하품하며 깨서 앉기 (D)' },
    // ── 우클릭 숨기 → 3분 뒤 나타나기 ─────────────────
    { id: 'cat_hide', src: C + 'cat_hide.mp4', from: 'sit', to: 'hidden', kind: 'hide', speed: 0.85, label: '우클릭 → 살포시 내려가 숨기 (G 0–1.2초)' },
    { id: 'cat_appear', src: C + 'cat_appear.mp4', from: 'hidden', to: 'sit', kind: 'appear', speed: 0.75, label: '귀 끝 → 눈치 빼꼼 → 올라와 자리 잡기 (G 1.2–5초)' },
  ],
}
