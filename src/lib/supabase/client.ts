import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/database'

let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null

function createMissingEnvProxy() {
  return new Proxy(
    {},
    {
      get() {
        throw new Error(
          "Supabase 환경변수가 없습니다. `NEXT_PUBLIC_SUPABASE_URL`과 `NEXT_PUBLIC_SUPABASE_ANON_KEY`를 설정해 주세요.",
        )
      },
    },
  ) as ReturnType<typeof createBrowserClient<Database>>
}

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    return createMissingEnvProxy()
  }

  if (!browserClient) {
    browserClient = createBrowserClient<Database>(url, anonKey)
  }

  return browserClient
}
