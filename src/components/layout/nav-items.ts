export const NAV = [
  { id: 'home', label: '홈', icon: '홈', short: '홈' },
  { id: 'entry', label: '지출 입력', icon: '입력', short: '입력' },
  { id: 'transactions', label: '지출 내역', icon: '내역', short: '내역' },
  { id: 'analytics', label: '분석', icon: '분석', short: '분석' },
  { id: 'assets', label: '자산', icon: '자산', short: '자산' },
  { id: 'recurring', label: '정기 지출', icon: '정기', short: '정기' },
  { id: 'categories', label: '카테고리', icon: '분류', short: '분류' },
  { id: 'family', label: '가족 공유', icon: '가족', short: '공유' },
] as const

export type NavId = (typeof NAV)[number]['id']
