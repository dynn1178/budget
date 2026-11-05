import type { CatManifest } from './clip-player'

/**
 * 클립 목록 (public/cat/clips/*.mp4)
 *
 * 허브 포즈
 *  - sit   : 앉아서 정면을 보는 기본 자세 (모든 sit 클립의 첫/마지막 프레임)
 *  - sleep : 몸을 말고 자는 자세
 *
 * 새 클립을 추가하려면: 허브에서 시작·끝나도록 생성 → process_clip.py 로 변환 → 아래에 한 줄 추가.
 * 예) { id: 'sit_yawn', src: '/cat/clips/sit_yawn.mp4', from: 'sit', to: 'sit', kind: 'action' }
 */
const C = '/cat/clips/'

export const defaultCatManifest: CatManifest = {
  startHub: 'sit',
  frame: { w: 360, h: 278 },
  hit: { cx: 0.5, cy: 0.6, rx: 0.2, ry: 0.36 },
  heartAt: { x: 0.5, y: 0.22 },
  clips: [
    { id: 'sit_idle', src: C + 'sit_idle.mp4', from: 'sit', to: 'sit', kind: 'idle', weight: 3 },
    { id: 'sit_look', src: C + 'sit_look.mp4', from: 'sit', to: 'sit', kind: 'idle', weight: 2 },
    { id: 'sit_wash', src: C + 'sit_wash.mp4', from: 'sit', to: 'sit', kind: 'action', weight: 1 },
    { id: 'sit_groom', src: C + 'sit_groom.mp4', from: 'sit', to: 'sit', kind: 'action', weight: 1 },
    { id: 'pet', src: C + 'pet.mp4', from: 'sit', to: 'sit', kind: 'pet' },
    { id: 'sit_to_sleep', src: C + 'sit_to_sleep.mp4', from: 'sit', to: 'sleep', kind: 'transition' },
    { id: 'sleep_loop', src: C + 'sleep_loop.mp4', from: 'sleep', to: 'sleep', kind: 'sleep' },
    { id: 'sleep_to_sit', src: C + 'sleep_to_sit.mp4', from: 'sleep', to: 'sit', kind: 'transition' },
  ],
}
