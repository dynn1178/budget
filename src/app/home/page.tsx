import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { DashboardClient } from './DashboardClient'

export default async function HomePage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // 이번 달 트랜잭션 + 카테고리 + 설정 병렬 로드
  const thisMonth = new Date().toISOString().slice(0, 7) // YYYY-MM
  const [{ data: transactions }, { data: categories }, { data: settings }, { data: assets }] = await Promise.all([
    supabase
      .from('budget_transactions')
      .select('*, category:budget_categories(id,name,icon,color)')
      .eq('user_id', user.id)
      .gte('date', `${thisMonth}-01`)
      .order('date', { ascending: false }),
    supabase
      .from('budget_categories')
      .select('*')
      .eq('user_id', user.id)
      .order('sort_order'),
    supabase
      .from('budget_settings')
      .select('*')
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('budget_assets')
      .select('*')
      .eq('user_id', user.id)
      .order('sort_order'),
  ])

  const userName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
  const userAvatar = user.user_metadata?.avatar_url

  return (
    <AppShell userName={userName} userAvatar={userAvatar}>
      <DashboardClient
        transactions={transactions || []}
        categories={categories || []}
        settings={settings}
        assets={assets || []}
      />
    </AppShell>
  )
}
