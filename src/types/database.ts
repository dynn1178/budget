// 실제 배포 시에는 `npx supabase gen types typescript ...` 결과로 대체할 수 있습니다.
// 현재 프로젝트에서는 화면 구현에 필요한 최소 타입만 유지합니다.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any

export type CategoryType = 'food' | 'trans' | 'shop' | 'house' | 'health' | 'fun' | 'etc'
export type AssetType = 'asset' | 'liability'
export type RecurringCycle = 'daily' | 'weekly' | 'monthly' | 'yearly'
export type FamilyRole = 'owner' | 'admin' | 'member' | 'editor' | 'viewer'
export type ThemeType = 'light' | 'dark' | 'grey' | 'sepia'
export type AccentType = 'teal' | 'blue' | 'purple' | 'green' | 'slate' | 'rose' | 'amber' | 'ocean' | ''
export type FontType = 'pretendard' | 'noto-sans' | 'gothic' | 'ibm' | 'noto-serif'

export interface BudgetCategory {
  id: string
  user_id: string
  name: string
  icon: string
  color: string
  budget_amount: number
  sort_order: number
  created_at: string
}

export interface BudgetTransaction {
  id: string
  user_id: string
  category_id: string | null
  date: string
  merchant: string
  amount: number
  account: string
  memo: string
  created_at: string
  category?: Pick<BudgetCategory, 'id' | 'name' | 'icon' | 'color'>
}

export interface BudgetAsset {
  id: string
  user_id: string
  name: string
  icon: string
  amount: number
  asset_type: AssetType
  note: string
  sort_order: number
  created_at: string
}

export interface BudgetRecurring {
  id: string
  user_id: string
  name: string
  icon: string
  amount: number
  category_name: string
  account: string
  cycle: RecurringCycle
  day_of_month: number
  active: boolean
  memo: string
  last_run_date: string | null
  created_at: string
}

export interface BudgetSetting {
  user_id: string
  monthly_budget: number
  theme: ThemeType
  accent: AccentType
  font: FontType
  updated_at: string
}

export interface BudgetMonthlySetting {
  id: string
  user_id: string
  year: number
  month: number
  budget_amount: number
  created_at: string
}

export interface FamilyGroup {
  id: string
  owner_id: string
  name: string
  invite_code?: string | null
  created_at: string
}

export interface FamilyMember {
  id: string
  group_id: string
  user_id: string
  role: FamilyRole
  display_name?: string | null
  joined_at: string
  profile?: { name: string; email: string; avatar_url: string | null }
}
