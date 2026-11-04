import type { BlackCatHandle, BlackCatOptions } from './cat-engine'

export function createBlackCat3D(container: HTMLElement, options?: BlackCatOptions): BlackCatHandle
/** true when WebGL is available (otherwise use the SVG engine) */
export function supportsWebGL(): boolean
