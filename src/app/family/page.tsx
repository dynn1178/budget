import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { FamilyClient } from './FamilyClient'

export default async function FamilyPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: membership } = await supabase
    .from('budget_family_members')
    .select('*, group:budget_family_groups(*)')
    .eq('user_id', user.id)
    .single()

  let members: unknown[] = []
  if (membership?.group_id) {
    const { data } = await supabase
      .from('budget_family_members')
      .select('*')
      .eq('group_id', membership.group_id)
    members = data || []
  }

  return (
    <AppShell userName={user.user_metadata?.full_name}>
      <FamilyClient
        userId={user.id}
        userName={user.user_metadata?.full_name || user.email || ''}
        membership={membership}
        members={members as never[]}
      />
    </AppShell>
  )
}
