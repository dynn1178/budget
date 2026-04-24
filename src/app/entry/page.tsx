import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { EntryClient } from './EntryClient'

export default async function EntryPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: categories } = await supabase
    .from('budget_categories')
    .select('*')
    .eq('user_id', user.id)
    .order('sort_order')

  const userName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'

  return (
    <AppShell userName={userName}>
      <EntryClient categories={categories || []} userId={user.id} />
    </AppShell>
  )
}
