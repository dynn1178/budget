export type NavItem =
  | { id: string; label: string; icon: string; short: string; divider?: false }
  | { id: 'divider'; label?: never; icon?: never; short?: never; divider: true }

export const NAV: NavItem[] = [
  { id: 'home',         label: '홈',       icon: '🏠', short: '홈'   },
  { id: 'entry',        label: '지출 기록',  icon: '✏️', short: '기록' },
  { id: 'recurring',    label: '정기 지출',  icon: '🔁', short: '정기' },
  { id: 'transactions', label: '지출 현황',  icon: '📋', short: '현황' },
  { id: 'analytics',    label: '지출 분석',  icon: '📊', short: '분석' },
  { id: 'assets',       label: '자산 관리',  icon: '💰', short: '자산' },
  { id: 'budget',       label: '예산 설정',  icon: '🎯', short: '예산' },
  { id: 'divider',      divider: true },
  { id: 'categories',   label: '카테고리',   icon: '🏷️', short: '분류' },
  { id: 'family',       label: '가족 공유',  icon: '👨‍👩‍👧', short: '가족' },
  { id: 'settings',     label: '설정',      icon: '⚙️', short: '설정' },
]

// First 5 non-divider items for the mobile bottom nav
export const BOTTOM_NAV = NAV.filter(
  (n): n is Extract<NavItem, { divider?: false }> => !n.divider
).slice(0, 5)
