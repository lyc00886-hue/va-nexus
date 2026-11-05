/**
 * Map-path shell.
 * Scroll down hides the sticky platform header. Scroll up, or returning to the top, shows it.
 * Classic path hides on phone width only. The 闖關 shell (`?ux=map1`) hides at any width.
 * Other tabs and an open gear panel never collapse it.
 */

/** Matches Tailwind `md` (768). Mobile nav is the same breakpoint. */
export const PLATFORM_HEADER_MOBILE_MQ = '(max-width: 767px)'

/** Fired when the cream MapPath shell mounts or unmounts. */
export const PLATFORM_HEADER_PATH_EVENT = 'va-map-path'

/** Always show the header when the page is this close to the top. */
export const PLATFORM_HEADER_TOP_PX = 4

/** Downward distance, in px, before the header tucks away. */
export const PLATFORM_HEADER_HIDE_ACC_PX = 16

/** Upward distance, in px, before the header comes back. */
export const PLATFORM_HEADER_SHOW_ACC_PX = 12

export type PlatformHeaderStep = {
  scrollY: number
  delta: number
  acc: number
  collapsed: boolean
  /** Phone width. Classic path collapses only here. */
  mobile: boolean
  /**
   * 闖關 shell is on screen (`data-map-shell="one"`).
   * That shell collapses on desktop as well as on a phone.
   */
  mapOne: boolean
  /** Cream path or the 闖關 shell is on screen. */
  path: boolean
  /** Gear panel is open, so the header stays where the 無障礙 controls are. */
  anchored: boolean
  /**
   * Header height in px. Hide only after that in-flow box has scrolled away,
   * so translating the sticky header does not leave a gap.
   */
  hidePast: number
}

export type PlatformHeaderState = {
  collapsed: boolean
  acc: number
}

export function stepPlatformHeader(step: PlatformHeaderStep): PlatformHeaderState {
  const allowWidth = step.mobile || step.mapOne
  if (
    !allowWidth ||
    !step.path ||
    step.anchored ||
    step.hidePast <= 0 ||
    step.scrollY <= PLATFORM_HEADER_TOP_PX
  ) {
    return { collapsed: false, acc: 0 }
  }
  if (Math.abs(step.delta) < 1) return { collapsed: step.collapsed, acc: step.acc }
  const sameWay = step.acc === 0 || Math.sign(step.delta) === Math.sign(step.acc)
  const acc = sameWay ? step.acc + step.delta : step.delta
  if (acc >= PLATFORM_HEADER_HIDE_ACC_PX && step.scrollY >= step.hidePast) {
    return { collapsed: true, acc: 0 }
  }
  if (acc <= -PLATFORM_HEADER_SHOW_ACC_PX) return { collapsed: false, acc: 0 }
  return { collapsed: step.collapsed, acc }
}
