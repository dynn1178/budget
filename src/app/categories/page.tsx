import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { CategoriesClient } from './CategoriesClient'

export default async function CategoriesPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: categories }, { data: assets }] = await Promise.all([
    supabase.from('budget_categories').select('*').eq('user_id', user.id).order('sort_order'),
    supabase.from('budget_assets').select('*').eq('user_id', user.id).order('sort_order'),
  ])

  return (
    <AppShell userName={user.user_metadata?.full_name}>
      <CategoriesClient
        categories={categories || []}
        assets={assets || []}
        userId={user.id}
      />
    </AppShell>
  )
}
