'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const hasSupabaseEnv =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

  async function handleGoogle() {
    if (!hasSupabaseEnv) {
      setError('Supabase 환경변수가 설정되지 않았습니다. Vercel 프로젝트 환경변수를 먼저 확인해 주세요.')
      return
    }

    setLoading(true)
    setError('')

    const sb = createClient()
    const { error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 400, background: 'var(--surface)', borderRadius: 18, padding: '36px 32px', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, var(--accent), var(--accent2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: '#fff', fontWeight: 900, margin: '0 auto 14px' }}>
            원
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--text)', margin: '0 0 8px' }}>WhereDidItGo</h1>
          <p style={{ fontSize: 13, color: 'var(--text3)', margin: 0, lineHeight: 1.7 }}>
            월 예산과 지출 흐름을 차분하게 관리하는 개인 가계부입니다.
          </p>
        </div>

        {error && (
          <div style={{ padding: '10px 14px', background: 'var(--red-bg)', borderRadius: 8, fontSize: 13, color: 'var(--red)', marginBottom: 16, textAlign: 'center' }}>
            {error}
          </div>
        )}

        {!hasSupabaseEnv && (
          <div style={{ padding: '10px 14px', background: 'var(--red-bg)', borderRadius: 8, fontSize: 13, color: 'var(--red)', marginBottom: 16, textAlign: 'center', lineHeight: 1.6 }}>
            `NEXT_PUBLIC_SUPABASE_URL`과 `NEXT_PUBLIC_SUPABASE_ANON_KEY`가 필요합니다.
          </div>
        )}

        <button
          type="button"
          onClick={handleGoogle}
          disabled={loading || !hasSupabaseEnv}
          style={{
            width: '100%',
            padding: '13px',
            borderRadius: 10,
            border: '1.5px solid var(--border2)',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            cursor: loading || !hasSupabaseEnv ? 'not-allowed' : 'pointer',
            fontSize: 15,
            fontWeight: 700,
            color: '#3C3C3C',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            opacity: loading || !hasSupabaseEnv ? 0.7 : 1,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.36-8.16 2.36-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
          </svg>
          {loading ? '로그인 중...' : 'Google 계정으로 로그인'}
        </button>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'var(--text3)', lineHeight: 1.7 }}>
          Supabase Google OAuth를 통해 안전하게 로그인합니다.
        </p>
      </div>
    </div>
  )
}
