import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { BudgetClient } from './BudgetClient'

export default async function BudgetPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1
  const since = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`

  // 12개월 이전부터 조회
  const historyStart = new Date(currentYear, currentMonth - 1 - 11, 1)
  const historySince = `${historyStart.getFullYear()}-${String(historyStart.getMonth() + 1).padStart(2, '0')}-01`

  const [
    { data: categories },
    { data: settings },
    { data: transactions },
    { data: monthlySettings },
    { data: historyTransactions },
  ] = await Promise.all([
    supabase.from('budget_categories').select('*').eq('user_id', user.id).order('sort_order'),
    supabase.from('budget_settings').select('*').eq('user_id', user.id).single(),
    supabase.from('budget_transactions').select('amount, category_id').eq('user_id', user.id).gte('date', since),
    supabase.from('budget_monthly_settings').select('*').eq('user_id', user.id),
    supabase.from('budget_transactions').select('amount, date').eq('user_id', user.id).gte('date', historySince),
  ])

  return (
    <AppShell userName={user.user_metadata?.full_name}>
      <BudgetClient
        categories={categories || []}
        settings={settings}
        transactions={transactions || []}
        monthlySettings={monthlySettings || []}
        historyTransactions={historyTransactions || []}
        userId={user.id}
      />
    </AppShell>
  )
}
