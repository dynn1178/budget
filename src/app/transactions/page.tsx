import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { TransactionsClient } from './TransactionsClient'

export default async function TransactionsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: transactions }, { data: categories }] = await Promise.all([
    supabase
      .from('budget_transactions')
      .select('*, category:budget_categories(id,name,icon,color)')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(200),
    supabase.from('budget_categories').select('*').eq('user_id', user.id).order('sort_order'),
  ])

  return (
    <AppShell userName={user.user_metadata?.full_name}>
      <TransactionsClient
        transactions={transactions || []}
        categories={categories || []}
        userId={user.id}
      />
    </AppShell>
  )
}
