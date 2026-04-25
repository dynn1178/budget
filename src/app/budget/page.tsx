import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { BudgetClient } from './BudgetClient'

export default async function BudgetPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const now = new Date()
  const since = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

  const [{ data: categories }, { data: settings }, { data: transactions }] = await Promise.all([
    supabase.from('budget_categories').select('*').eq('user_id', user.id).order('sort_order'),
    supabase.from('budget_settings').select('*').eq('user_id', user.id).single(),
    supabase
      .from('budget_transactions')
      .select('amount, category_id')
      .eq('user_id', user.id)
      .gte('date', since),
  ])

  return (
    <AppShell userName={user.user_metadata?.full_name}>
      <BudgetClient
        categories={categories || []}
        settings={settings}
        transactions={transactions || []}
        userId={user.id}
      />
    </AppShell>
  )
}
