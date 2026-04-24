import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { AssetsClient } from './AssetsClient'

export default async function AssetsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: assets } = await supabase
    .from('budget_assets')
    .select('*')
    .eq('user_id', user.id)
    .order('sort_order')

  return (
    <AppShell userName={user.user_metadata?.full_name}>
      <AssetsClient assets={assets || []} userId={user.id} />
    </AppShell>
  )
}
