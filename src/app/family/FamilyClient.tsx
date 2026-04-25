'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Toggle } from '@/components/ui/Toggle'
import { SectionTitle } from '@/components/ui/SectionTitle'
import { useWindowSize } from '@/hooks/useWindowSize'
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
  viewer: '열람자',
}

const roleColors: Record<string, string> = {
  owner: 'var(--accent)',
  admin: 'var(--teal)',
  editor: 'var(--green)',
  member: 'var(--text2)',
  viewer: 'var(--text3)',
}

const roleBgColors: Record<string, string> = {
  owner: 'var(--accent-bg)',
  admin: 'var(--teal-bg)',
  editor: 'var(--green-bg)',
  member: 'var(--bg2)',
  viewer: 'var(--bg2)',
}

// Static demo activity feed
const ACTIVITY_DEMO = [
  { id: '1', actor: '김지민', action: '지출을 추가했습니다', detail: '스타벅스 · 6,500원', time: '10분 전', initials: '김' },
  { id: '2', actor: '이수진', action: '예산을 수정했습니다', detail: '식비 예산 → 500,000원', time: '1시간 전', initials: '이' },
  { id: '3', actor: '박현우', action: '카테고리를 추가했습니다', detail: '여행 카테고리', time: '어제', initials: '박' },
  { id: '4', actor: '김지민', action: '정기 지출을 추가했습니다', detail: '넷플릭스 · 17,000원', time: '2일 전', initials: '김' },
  { id: '5', actor: '이수진', action: '그룹에 참여했습니다', detail: '편집자 역할', time: '5일 전', initials: '이' },
]

const AVATAR_COLORS = ['#2E7D70', '#2563EB', '#7C3AED', '#E11D48', '#D97706', '#16A34A']

export function FamilyClient({ userId, userName, membership, members }: Props) {
  const sb = createClient()
  const router = useRouter()
  const { isMobile } = useWindowSize()
  const [groupName, setGroupName] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor')
  const [shareToggle, setShareToggle] = useState(true)
  const [alertToggle, setAlertToggle] = useState(false)

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
    if (error) { setMsg(error.message); return }
    router.refresh()
  }

  const cardStyle = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: isMobile ? '16px' : '20px 24px',
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
    boxSizing: 'border-box' as const,
  }

  const btnStyle = (primary: boolean) => ({
    padding: '10px 18px',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    background: primary ? 'var(--accent)' : 'var(--bg2)',
    color: primary ? '#fff' : 'var(--text2)',
    fontWeight: 800,
    fontSize: 13,
    cursor: 'pointer',
  } as const)

  if (!membership) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 720 }}>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>👨‍👩‍👧‍👦</div>
            <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--text)', marginBottom: 8 }}>가족 공유 공간</div>
            <div style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.8 }}>
              가족 단위로 예산과 지출 내역을 함께 관리할 수 있습니다.
              <br />
              그룹을 만들고 가족을 초대해 보세요.
            </div>
          </div>
        </div>

        <div style={cardStyle}>
          <SectionTitle sub="먼저 가족 그룹을 만들고 소유자로 참여합니다">새 그룹 만들기</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              placeholder="예: 우리 집 가계부"
              style={fieldStyle}
            />
            <button type="button" onClick={createGroup} disabled={loading} style={{ ...btnStyle(true), padding: '12px' }}>
              {loading ? '생성 중...' : '가족 그룹 만들기'}
            </button>
          </div>
        </div>

        <div style={cardStyle}>
          <SectionTitle>다음 단계</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, color: 'var(--text2)', lineHeight: 1.8 }}>
            {['그룹 생성 후 초대 링크로 가족을 초대할 수 있습니다.', '멤버별로 소유자/편집자/열람자 역할을 부여할 수 있습니다.', '공유 예산으로 가족의 총 지출을 한눈에 볼 수 있습니다.'].map((text, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--accent-bg)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, flexShrink: 0 }}>{i + 1}</span>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {msg && <div style={{ padding: '12px 16px', borderRadius: 10, background: 'var(--red-bg)', color: 'var(--red)', fontSize: 13, fontWeight: 700 }}>{msg}</div>}
      </div>
    )
  }

  const group = membership.group

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Group header */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--text)' }}>{group.name}</div>
            <div style={{ marginTop: 4, fontSize: 12, color: 'var(--text3)' }}>내 역할: {roleLabels[membership.role] || membership.role}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* Avatar stack */}
            <div style={{ display: 'flex' }}>
              {members.slice(0, 4).map((m, i) => (
                <div
                  key={m.id}
                  style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: AVATAR_COLORS[i % AVATAR_COLORS.length],
                    border: '2px solid var(--surface)',
                    marginLeft: i > 0 ? -8 : 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 900, color: '#fff', flexShrink: 0,
                  }}
                >
                  {(m.display_name || m.user_id).slice(0, 1).toUpperCase()}
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setShowInviteModal(true)} style={btnStyle(true)}>+ 초대</button>
          </div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text3)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <span>멤버 {members.length}명</span>
          {group.invite_code && <span>초대 코드: <strong style={{ color: 'var(--text)' }}>{group.invite_code}</strong></span>}
        </div>
      </div>

      {/* Member list */}
      <div style={cardStyle}>
        <SectionTitle sub={`현재 ${members.length}명이 참여 중입니다`}>멤버 목록</SectionTitle>
        {members.map((member, index) => {
          const isMe = member.user_id === userId
          const color = AVATAR_COLORS[index % AVATAR_COLORS.length]
          return (
            <div
              key={member.id}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: index < members.length - 1 ? '1px solid var(--border)' : 'none' }}
            >
              {/* Avatar */}
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: color, border: `2px solid ${color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#fff', fontSize: 16, flexShrink: 0 }}>
                {(member.display_name || member.user_id).slice(0, 1).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                    {member.display_name || `사용자 ${member.user_id.slice(0, 8)}`}
                  </span>
                  {/* Role badge */}
                  <span style={{ fontSize: 10, fontWeight: 800, color: roleColors[member.role] || 'var(--text2)', background: roleBgColors[member.role] || 'var(--bg2)', padding: '2px 7px', borderRadius: 999 }}>
                    {roleLabels[member.role] || member.role}
                  </span>
                  {isMe && (
                    <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--accent)', background: 'var(--accent-bg)', padding: '2px 7px', borderRadius: 999 }}>나</span>
                  )}
                </div>
                {member.profile?.email && (
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{member.profile.email}</div>
                )}
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>
                  {member.joined_at ? `가입: ${member.joined_at.slice(0, 10)}` : ''}
                </div>
              </div>
              {!isMe && membership.role === 'owner' && (
                <select
                  defaultValue={member.role}
                  style={{ padding: '6px 10px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border2)', background: 'var(--bg)', color: 'var(--text)', fontSize: 12, cursor: 'pointer' }}
                >
                  <option value="editor">편집자</option>
                  <option value="viewer">열람자</option>
                </select>
              )}
            </div>
          )
        })}
      </div>

      {/* Shared settings */}
      <div style={cardStyle}>
        <SectionTitle>공유 설정</SectionTitle>
        {[
          { label: '예산 공유', sub: '그룹 멤버와 예산을 공유합니다', value: shareToggle, toggle: () => setShareToggle(v => !v) },
          { label: '활동 알림', sub: '멤버의 지출 추가시 알림을 받습니다', value: alertToggle, toggle: () => setAlertToggle(v => !v) },
        ].map(item => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{item.label}</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{item.sub}</div>
            </div>
            <Toggle checked={item.value} onChange={item.toggle} />
          </div>
        ))}
      </div>

      {/* Activity feed — static demo */}
      <div style={cardStyle}>
        <SectionTitle sub="데모 데이터 · 최근 그룹 활동입니다">최근 활동</SectionTitle>
        {ACTIVITY_DEMO.map((activity, index) => (
          <div key={activity.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderBottom: index < ACTIVITY_DEMO.length - 1 ? '1px solid var(--border)' : 'none' }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: AVATAR_COLORS[index % AVATAR_COLORS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#fff', fontSize: 13, flexShrink: 0 }}>
              {activity.initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, color: 'var(--text)' }}>
                <strong>{activity.actor}</strong>이(가) {activity.action}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{activity.detail}</div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', flexShrink: 0 }}>{activity.time}</div>
          </div>
        ))}
      </div>

      {/* Monthly email report */}
      <div style={cardStyle}>
        <SectionTitle sub="월간 이메일 리포트 수신 설정">월간 리포트</SectionTitle>
        {members.slice(0, 3).map((member, index) => (
          <div key={member.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: index < Math.min(members.length, 3) - 1 ? '1px solid var(--border)' : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: AVATAR_COLORS[index % AVATAR_COLORS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, color: '#fff' }}>
                {(member.display_name || member.user_id).slice(0, 1).toUpperCase()}
              </div>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{member.display_name || `멤버 ${index + 1}`}</span>
            </div>
            <Toggle checked={index < 2} onChange={() => {}} />
          </div>
        ))}
      </div>

      <button type="button" onClick={leaveGroup} style={{ ...btnStyle(false), color: 'var(--red)', alignSelf: 'flex-start' }}>그룹 나가기</button>

      {msg && <div style={{ padding: '12px 16px', borderRadius: 10, background: 'var(--red-bg)', color: 'var(--red)', fontSize: 13, fontWeight: 700 }}>{msg}</div>}

      {/* Invite modal */}
      {showInviteModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.44)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => e.target === e.currentTarget && setShowInviteModal(false)}
        >
          <div style={{ width: '100%', maxWidth: 420, background: 'var(--surface)', borderRadius: 'var(--radius)', padding: '24px', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 17, fontWeight: 900 }}>멤버 초대</div>
              <button type="button" onClick={() => setShowInviteModal(false)} style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text3)' }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--text3)', marginBottom: 6 }}>이메일</label>
                <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="friend@example.com" style={fieldStyle} type="email" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--text3)', marginBottom: 6 }}>역할</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['editor', 'viewer'] as const).map(role => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setInviteRole(role)}
                      style={{ flex: 1, padding: '10px', borderRadius: 'var(--radius-sm)', border: inviteRole === role ? '2px solid var(--accent)' : '1px solid var(--border2)', background: inviteRole === role ? 'var(--accent-bg)' : 'var(--surface)', cursor: 'pointer', fontWeight: 800, fontSize: 13, color: inviteRole === role ? 'var(--accent)' : 'var(--text2)' }}
                    >
                      {roleLabels[role]}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button type="button" onClick={() => setShowInviteModal(false)} style={{ ...btnStyle(false), flex: 1 }}>취소</button>
                <button
                  type="button"
                  onClick={() => { setShowInviteModal(false); setInviteEmail('') }}
                  style={{ ...btnStyle(true), flex: 1 }}
                >
                  초대 보내기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
