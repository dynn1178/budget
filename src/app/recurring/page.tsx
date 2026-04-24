import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { RecurringClient } from './RecurringClient'

export default async function RecurringPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: recurring }, { data: categories }] = await Promise.all([
    supabase.from('budget_recurring').select('*').eq('user_id', user.id).order('sort_order'),
    supabase.from('budget_categories').select('*').eq('user_id', user.id).order('sort_order'),
  ])

  return (
    <AppShell userName={user.user_metadata?.full_name}>
      <RecurringClient recurring={recurring || []} categories={categories || []} userId={user.id} />
    </AppShell>
  )
}
