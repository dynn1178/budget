import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { AnalyticsClient } from './AnalyticsClient'

export default async function AnalyticsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const threeMonthsAgo = new Date()
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 12)
  const since = threeMonthsAgo.toISOString().slice(0, 10)

  const [{ data: transactions }, { data: categories }, { data: settings }] = await Promise.all([
    supabase.from('budget_transactions').select('*, category:budget_categories(id,name,icon,color)').eq('user_id', user.id).gte('date', since).order('date', { ascending: false }),
    supabase.from('budget_categories').select('*').eq('user_id', user.id).order('sort_order'),
    supabase.from('budget_settings').select('*').eq('user_id', user.id).single(),
  ])

  return (
    <AppShell userName={user.user_metadata?.full_name}>
      <AnalyticsClient transactions={transactions || []} categories={categories || []} settings={settings} />
    </AppShell>
  )
}
