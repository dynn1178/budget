import { createServerClient, type CookieMethodsServer } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/types/database'

function createFallbackServerClient() {
  return {
    auth: {
      async getUser() {
        return { data: { user: null }, error: null }
      },
      async signOut() {
        return { error: null }
      },
      async exchangeCodeForSession() {
        return {
          data: { session: null, user: null },
          error: new Error('Supabase environment variables are missing.'),
        }
      },
    },
    from() {
      const chain = {
        select() {
          return chain
        },
        eq() {
          return chain
        },
        gte() {
          return chain
        },
        order() {
          return chain
        },
        limit() {
          return chain
        },
        single: async () => ({ data: null, error: null }),
        then(resolve: (value: { data: []; error: null }) => unknown) {
          return Promise.resolve(resolve({ data: [], error: null }))
        },
      }
      return chain
    },
  } as any
}

export async function createServerSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return createFallbackServerClient()
  }

  const cookieStore = await cookies()
  const cookieMethods: CookieMethodsServer = {
    getAll() {
      return cookieStore.getAll()
    },
    setAll(cookiesToSet) {
      try {
        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
      } catch {}
    },
  }

  try {
    return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
      cookies: cookieMethods,
    })
  } catch {
    return createFallbackServerClient()
  }
}
