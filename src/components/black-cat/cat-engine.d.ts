export type BlackCatBehavior =
  | 'walk' | 'stand' | 'sit' | 'groom' | 'wash' | 'lie' | 'sleep' | 'stretch' | 'petted'

export interface BlackCatOptions {
  /** 크기 배율 (기본 1 ≈ 길이 120px) */
  size?: number
  /** 다크 배경용 테두리 빛. 'auto' = <html data-theme="dark"> 또는 OS 다크모드 감지 */
  glow?: boolean | 'auto'
  /** 쓰다듬기/클릭 반응 여부 */
  interactive?: boolean
}

export interface BlackCatHandle {
  play(name: BlackCatBehavior): void
  meow(): void
  readonly state: string
  setGlow(v: boolean | 'auto'): void
  destroy(): void
}

export function createBlackCat(container: HTMLElement, options?: BlackCatOptions): BlackCatHandle
