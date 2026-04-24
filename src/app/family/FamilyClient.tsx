'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { SectionTitle } from '@/components/ui/SectionTitle'
import type { FamilyGroup, FamilyMember } from '@/types/database'

interface MembershipData {
  group_id: string
  role: string
  group: FamilyGroup
}

interface Props {
  userId: string
  userName: string
  membership: MembershipData | null
  members: FamilyMember[]
}

const roleLabels: Record<string, string> = {
  owner: '소유자',
  admin: '관리자',
  member: '멤버',
  editor: '편집자',
  viewer: '조회자',
}

export function FamilyClient({ userId, membership, members }: Props) {
  const sb = createClient()
  const router = useRouter()
  const [groupName, setGroupName] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  const createGroup = async () => {
    if (!groupName.trim()) {
      setMsg('가족 그룹 이름을 입력해 주세요.')
      return
    }

    setLoading(true)
    setMsg('')

    const { data: group, error } = await sb
      .from('budget_family_groups')
      .insert({ name: groupName.trim(), owner_id: userId })
      .select()
      .single()

    if (error || !group) {
      setMsg('가족 그룹을 만들지 못했습니다.')
      setLoading(false)
      return
    }

    const { error: memberError } = await sb
      .from('budget_family_members')
      .insert({ group_id: group.id, user_id: userId, role: 'owner' })

    if (memberError) {
      setMsg(memberError.message)
      setLoading(false)
      return
    }

    setLoading(false)
    router.refresh()
  }

  const leaveGroup = async () => {
    if (!membership) return

    const { error } = await sb
      .from('budget_family_members')
      .delete()
      .eq('group_id', membership.group_id)
      .eq('user_id', userId)

    if (error) {
      setMsg(error.message)
      return
    }

    router.refresh()
  }

  const cardStyle = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '20px 24px',
    boxShadow: 'var(--shadow-sm)',
  } as const

  const fieldStyle = {
    width: '100%',
    padding: '11px 13px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border2)',
    background: 'var(--surface)',
    color: 'var(--text)',
    fontSize: 14,
  } as const

  const buttonStyle = (primary: boolean) =>
    ({
      padding: '10px 18px',
      borderRadius: 'var(--radius-sm)',
      border: 'none',
      background: primary ? 'var(--accent)' : 'var(--bg2)',
      color: primary ? '#fff' : 'var(--text2)',
      fontWeight: 800,
      fontSize: 13,
      cursor: 'pointer',
    }) as const

  if (!membership) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 720 }}>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
            <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--text)', marginBottom: 8 }}>가족 공유 공간</div>
            <div style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.7 }}>
              가족 단위로 예산과 지출 내역을 함께 보려는 준비 화면입니다.
              <br />
              현재 스키마 기준에서는 그룹 생성과 멤버 확인까지 안전하게 지원합니다.
            </div>
          </div>
        </div>

        <div style={cardStyle}>
          <SectionTitle sub="먼저 가족 그룹을 만들고 소유자로 참여합니다">새 그룹 만들기</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="예: 우리 집 가계부" style={fieldStyle} />
            <button type="button" onClick={createGroup} disabled={loading} style={{ ...buttonStyle(true), width: '100%', padding: '12px' }}>
              {loading ? '생성 중...' : '가족 그룹 만들기'}
            </button>
          </div>
        </div>

        <div style={cardStyle}>
          <SectionTitle>다음 단계</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: 'var(--text2)', lineHeight: 1.7 }}>
            <div>1. 그룹 생성 후 소유자와 멤버 목록을 확인할 수 있습니다.</div>
            <div>2. 초대 코드, 역할 권한, 가족별 예산 합산 기능은 이후 스키마 확장과 함께 붙이기 좋게 정리해 두었습니다.</div>
          </div>
        </div>

        {msg && <div style={{ padding: '12px 16px', borderRadius: 10, background: 'var(--red-bg)', color: 'var(--red)', fontSize: 13, fontWeight: 700 }}>{msg}</div>}
      </div>
    )
  }

  const group = membership.group

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--text)' }}>{group.name}</div>
            <div style={{ marginTop: 4, fontSize: 12, color: 'var(--text3)' }}>내 역할: {roleLabels[membership.role] || membership.role}</div>
          </div>
          <button type="button" onClick={leaveGroup} style={{ ...buttonStyle(false), color: 'var(--red)' }}>
            그룹 나가기
          </button>
        </div>

        <div style={{ marginTop: 16, padding: '14px 16px', borderRadius: 'var(--radius-sm)', background: 'var(--bg)' }}>
          <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.7 }}>
            가족 공유 기능은 현재 그룹 관리 중심으로 동작합니다.
            <br />
            이후 가족별 예산 합산, 공동 지출 승인, 초대 링크 기능을 추가하기 좋은 구조로 정리했습니다.
          </div>
        </div>
      </div>

      <div style={cardStyle}>
        <SectionTitle sub={`현재 ${members.length}명이 참여 중입니다`}>멤버 목록</SectionTitle>
        {members.map((member, index) => (
          <div
            key={member.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 0',
              borderBottom: index < members.length - 1 ? '1px solid var(--border)' : 'none',
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: 'var(--accent-bg)',
                color: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
              }}
            >
              {(member.display_name || member.user_id).slice(0, 1).toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{member.display_name || `사용자 ${member.user_id.slice(0, 8)}`}</div>
              <div style={{ marginTop: 2, fontSize: 12, color: 'var(--text3)' }}>{roleLabels[member.role] || member.role}</div>
            </div>
            {member.user_id === userId && (
              <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--accent)', background: 'var(--accent-bg)', padding: '4px 9px', borderRadius: 999 }}>
                나
              </span>
            )}
          </div>
        ))}
      </div>

      {msg && <div style={{ padding: '12px 16px', borderRadius: 10, background: 'var(--red-bg)', color: 'var(--red)', fontSize: 13, fontWeight: 700 }}>{msg}</div>}
    </div>
  )
}
