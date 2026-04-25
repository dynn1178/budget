import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { SettingsClient } from './SettingsClient'

export default async function SettingsPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: settings } = await supabase
    .from('budget_settings')
    .select('*')
    .eq('user_id', user.id)
    .single()

  return (
    <AppShell userName={user.user_metadata?.full_name}>
      <SettingsClient
        settings={settings}
        userId={user.id}
        userEmail={user.email || ''}
        userName={user.user_metadata?.full_name || ''}
        userAvatar={user.user_metadata?.avatar_url || null}
      />
    </AppShell>
  )
}
