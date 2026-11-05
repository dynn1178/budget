import type { CatManifest } from './clip-player'

/**
 * 아기 말티즈 클립 목록 (public/dog/clips/*.mp4) — Kling 영상 M1~M6에서 잘라냄
 *
 * 허브(기준 자세)
 *  - sit : 왼쪽을 보고 앉은 기본 자세 (모든 영상의 첫/마지막 프레임)
 *  - nap : 엎드려 자는 자세 (M5)
 *
 * fadeIn/fadeOut: 영상 중간에서 자른 클립은 허브 프레임과 자세가 달라 재생 중 크로스페이드로 잇는다.
 * 라이브러리 전용(자동 재생 안 함): dog_beg, dog_treat_eat, dog_hide, dog_peek, dog_climb_up
 */
const D = '/dog/clips/'

export const dogManifest: CatManifest = {
  startHub: 'sit',
  // 원본보다 차분하게: 기본 0.7배, 빠른 동작은 클립별 0.85배
  speed: 0.7,
  // 우클릭으로 숨은 뒤 다시 나타나기까지 (초)
  hiddenFor: 180,
  frame: { w: 420, h: 314 },
  hit: { cx: 0.5, cy: 0.56, rx: 0.3, ry: 0.4 },
  heartAt: { x: 0.42, y: 0.1 },
  // 숨바꼭질은 영상(dog_hide_peek)으로 하므로 코드 연출은 끔
  hide: { chance: 0, earsAt: 0.85, eyesAt: 0.55 },
  clips: [
    // ── 평소 모습 (idle) ─────────────────────────────
    { id: 'dog_look_around', src: D + 'dog_look_around.mp4', from: 'sit', to: 'sit', kind: 'idle', weight: 3, label: '두리번두리번 (M1)' },
    { id: 'dog_head_tilt', src: D + 'dog_head_tilt.mp4', from: 'sit', to: 'sit', kind: 'idle', weight: 1.5, fadeIn: 0.3, fadeOut: 0.3, label: '갸우뚱 + 귀 쫑긋 (M1)' },
    { id: 'dog_tongue_blep', src: D + 'dog_tongue_blep.mp4', from: 'sit', to: 'sit', kind: 'idle', weight: 1.5, fadeIn: 0.3, fadeOut: 0.3, label: '혀 쏙 (M1)' },
    { id: 'dog_look_down', src: D + 'dog_look_down.mp4', from: 'sit', to: 'sit', kind: 'idle', weight: 1, fadeIn: 0.3, label: '눈 깜빡 + 발 내려다보기 (M1)' },
    // ── 행동 (action) ────────────────────────────────
    { id: 'dog_yawn', src: D + 'dog_yawn.mp4', from: 'sit', to: 'sit', kind: 'action', speed: 0.85, weight: 1, fadeOut: 0.3, label: '하품 + 재채기 (M2)' },
    { id: 'dog_scratch', src: D + 'dog_scratch.mp4', from: 'sit', to: 'sit', kind: 'action', speed: 0.85, weight: 1, fadeIn: 0.3, fadeOut: 0.3, label: '뒷발로 귀 긁기, 휘청 (M2)' },
    { id: 'dog_paw_lick', src: D + 'dog_paw_lick.mp4', from: 'sit', to: 'sit', kind: 'action', weight: 0.8, fadeIn: 0.3, fadeOut: 0.3, label: '앞발 핥기 (M2)' },
    { id: 'dog_shake', src: D + 'dog_shake.mp4', from: 'sit', to: 'sit', kind: 'action', speed: 0.85, weight: 0.8, fadeIn: 0.3, label: '꼬리 깨물기 + 온몸 털기 (M2)' },
    { id: 'dog_play_bow', src: D + 'dog_play_bow.mp4', from: 'sit', to: 'sit', kind: 'action', speed: 0.85, weight: 1, fadeOut: 0.3, label: '놀자 자세 + 멍! (M3)' },
    { id: 'dog_hop', src: D + 'dog_hop.mp4', from: 'sit', to: 'sit', kind: 'action', speed: 0.85, weight: 0.8, fadeIn: 0.3, fadeOut: 0.3, label: '두 발로 콩콩 (M3)' },
    { id: 'dog_spin', src: D + 'dog_spin.mp4', from: 'sit', to: 'sit', kind: 'action', speed: 0.85, weight: 0.6, fadeIn: 0.3, fadeOut: 0.3, label: '꼬리 쫓아 한 바퀴 (M3)' },
    { id: 'dog_happy_pant', src: D + 'dog_happy_pant.mp4', from: 'sit', to: 'sit', kind: 'action', weight: 1, fadeIn: 0.3, label: '혀 내밀고 헥헥, 신남 (M3)' },
    { id: 'dog_lick_lips', src: D + 'dog_lick_lips.mp4', from: 'sit', to: 'sit', kind: 'action', weight: 0.6, fadeIn: 0.3, fadeOut: 0.3, label: '혀로 입맛 다시기 (M4)' },
    { id: 'dog_thank_paw', src: D + 'dog_thank_paw.mp4', from: 'sit', to: 'sit', kind: 'action', weight: 0.6, fadeIn: 0.3, label: '앞발 들고 웃기 (M4)' },
    { id: 'dog_paw_shake', src: D + 'dog_paw_shake.mp4', from: 'sit', to: 'sit', kind: 'action', weight: 0.8, fadeIn: 0.3, fadeOut: 0.3, label: '손! (M5)' },
    { id: 'dog_hide_peek', src: D + 'dog_hide_peek.mp4', from: 'sit', to: 'sit', kind: 'action', weight: 0.5, label: '쏙 숨었다 담벼락 넘듯 빼꼼 (M6)' },
    // ── 쓰다듬기 · 간식 ─────────────────────────────
    { id: 'dog_pet_happy', src: D + 'dog_pet_happy.mp4', from: 'sit', to: 'sit', kind: 'pet', fadeIn: 0.35, fadeOut: 0.3, label: '쓰다듬 반응 — 혀 쏙, 기대기 (M5)' },
    { id: 'dog_treat', src: D + 'dog_treat.mp4', from: 'sit', to: 'sit', kind: 'treat', speed: 0.85, fadeIn: 0.3, label: '간식 — 주세요 → 냠냠 → 입맛 → 고마워 (M4)' },
    // ── 낮잠 ─────────────────────────────────────────
    { id: 'dog_doze_off', src: D + 'dog_doze_off.mp4', from: 'sit', to: 'nap', kind: 'transition', fadeIn: 0.3, label: '꾸벅꾸벅 엎드리기 (M5)' },
    { id: 'dog_nap_loop', src: D + 'dog_nap_loop.mp4', from: 'nap', to: 'nap', kind: 'sleep', label: '엎드려 쌔근쌔근 (M5)' },
    { id: 'dog_wake_stretch', src: D + 'dog_wake_stretch.mp4', from: 'nap', to: 'sit', kind: 'transition', fadeIn: 0.3, label: '기지개 + 하품하고 앉기 (M5)' },
    // ── 우클릭 숨기 → 3분 뒤 나타나기 ─────────────────
    { id: 'dog_hide', src: D + 'dog_hide.mp4', from: 'sit', to: 'hidden', kind: 'hide', speed: 0.85, label: '우클릭 → 쏙 숨기 (M6 0–0.9초)' },
    { id: 'dog_appear', src: D + 'dog_appear.mp4', from: 'hidden', to: 'sit', kind: 'appear', speed: 0.75, label: '앞발 걸치고 빼꼼 → 영차 넘어와 앉기 (M6 0.9–5초)' },
  ],
}
