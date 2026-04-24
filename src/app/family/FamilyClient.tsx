'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { SectionTitle } from '@/components/ui/SectionTitle'
import type { FamilyGroup, FamilyMember } from '@/types/database'

interface MembershipData {
  group_id: string
  role: string
  display_name: string
  group: FamilyGroup
}

interface Props {
  userId: string
  userName: string
  membership: MembershipData | null
  members: FamilyMember[]
}

export function FamilyClient({ userId, userName, membership, members }: Props) {
  const sb = createClient()
  const router = useRouter()
  const [groupName, setGroupName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  const createGroup = async () => {
    if (!groupName.trim()) return
    setLoading(true)
    const code = Math.random().toString(36).substring(2, 8).toUpperCase()
    const { data: group, error } = await sb.from('budget_family_groups').insert({ name: groupName, owner_id: userId, invite_code: code }).select().single()
    if (error || !group) { setMsg('그룹 생성 실패'); setLoading(false); return }
    await sb.from('budget_family_members').insert({ group_id: group.id, user_id: userId, role: 'owner', display_name: userName })
    setLoading(false); router.refresh()
  }

  const joinGroup = async () => {
    if (!inviteCode.trim()) return
    setLoading(true)
    const { data: group } = await sb.from('budget_family_groups').select('*').eq('invite_code', inviteCode.toUpperCase()).single()
    if (!group) { setMsg('유효하지 않은 초대 코드입니다'); setLoading(false); return }
    const { error } = await sb.from('budget_family_members').insert({ group_id: group.id, user_id: userId, role: 'member', display_name: userName })
    if (error) { setMsg('이미 가입된 그룹이거나 오류가 발생했습니다'); setLoading(false); return }
    setLoading(false); router.refresh()
  }

  const leaveGroup = async () => {
    if (!membership) return
    if (!confirm('그룹에서 나가시겠습니까?')) return
    await sb.from('budget_family_members').delete().eq('group_id', membership.group_id).eq('user_id', userId)
    router.refresh()
  }

  const card = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px 24px', boxShadow: 'var(--shadow-sm)' } as const
  const inputStyle = { width: '100%', padding: '10px 13px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border2)', fontSize: 14, fontFamily: 'var(--font-sans)', color: 'var(--text)', background: 'var(--surface)', outline: 'none', boxSizing: 'border-box' as const }
  const btnStyle = (primary: boolean) => ({ padding: '10px 20px', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 700, background: primary ? 'var(--accent)' : 'var(--bg2)', color: primary ? '#fff' : 'var(--text2)' }) as React.CSSProperties

  const roleLabels: Record<string, string> = { owner: '👑 오너', admin: '⚙️ 관리자', member: '👤 멤버' }

  if (!membership) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={card}>
          <div style={{ textAlign: 'center', padding: '20px 0 24px' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>👨‍👩‍👧‍👦</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>가족 공유</div>
            <div style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.6 }}>가족과 함께 예산을 관리해보세요.<br />그룹을 만들거나 초대 코드로 참여할 수 있습니다.</div>
          </div>
        </div>

        <div style={card}>
          <SectionTitle>새 그룹 만들기</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input style={inputStyle} placeholder="그룹 이름 (예: 우리 가족)" value={groupName} onChange={e => setGroupName(e.target.value)} />
            <button onClick={createGroup} disabled={loading} style={{ ...btnStyle(true), width: '100%', padding: '12px' }}>
              {loading ? '생성 중...' : '그룹 만들기'}
            </button>
          </div>
        </div>

        <div style={card}>
          <SectionTitle>초대 코드로 참여</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input style={inputStyle} placeholder="초대 코드 입력 (예: ABC123)" value={inviteCode} onChange={e => setInviteCode(e.target.value)} />
            <button onClick={joinGroup} disabled={loading} style={{ ...btnStyle(false), width: '100%', padding: '12px' }}>
              {loading ? '참여 중...' : '그룹 참여'}
            </button>
          </div>
        </div>

        {msg && <div style={{ padding: '12px 16px', background: 'var(--red-bg, #FEE2E2)', borderRadius: 'var(--radius-sm)', fontSize: 13, color: 'var(--red)', fontWeight: 600 }}>{msg}</div>}
      </div>
    )
  }

  const group = membership.group
  const isOwner = membership.role === 'owner'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--text)' }}>{group.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>나의 역할: {roleLabels[membership.role] || membership.role}</div>
          </div>
          <button onClick={leaveGroup} style={{ ...btnStyle(false), fontSize: 12, padding: '7px 14px', color: 'var(--red)' }}>나가기</button>
        </div>

        {isOwner && (
          <div style={{ marginTop: 16, padding: '14px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>초대 코드</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: '0.15em', color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}>{group.invite_code}</div>
              <button onClick={() => navigator.clipboard.writeText(group.invite_code || '')} style={{ ...btnStyle(false), fontSize: 11, padding: '5px 10px' }}>복사</button>
            </div>
          </div>
        )}
      </div>

      <div style={card}>
        <SectionTitle>멤버 ({members.length}명)</SectionTitle>
        {members.map((m, i) => (
          <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: i < members.length - 1 ? '1px solid var(--border)' : 'none' }}>
            <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: '#fff', fontWeight: 700, flexShrink: 0 }}>
              {m.display_name?.[0] || '?'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{m.display_name}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>{roleLabels[m.role] || m.role}</div>
            </div>
            {m.user_id === userId && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: 'var(--accent-bg)', color: 'var(--accent)', fontWeight: 700 }}>나</span>}
          </div>
        ))}
      </div>

      <div style={{ ...card, textAlign: 'center', color: 'var(--text3)', fontSize: 13, padding: '20px' }}>
        <div style={{ fontSize: 24, marginBottom: 8 }}>🔧</div>
        가족 공유 기능은 현재 개발 중입니다.<br />곧 지출 공유 및 합산 기능이 추가될 예정입니다.
      </div>
    </div>
  )
}
