import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient, type CookieMethodsServer } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (pathname.startsWith('/auth')) {
    return NextResponse.next()
  }

  let response = NextResponse.next({ request })

  // 배포 환경변수가 아직 없거나 잘못된 경우에도 미들웨어가 500을 내지 않게 합니다.
  if (!supabaseUrl || !supabaseAnonKey) {
    return response
  }

  const cookieMethods: CookieMethodsServer = {
    getAll() {
      return request.cookies.getAll()
    },
    setAll(cookiesToSet) {
      cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
      response = NextResponse.next({ request })
      cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
    },
  }

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: cookieMethods,
    })

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user && pathname !== '/') {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }

    if (user && pathname === '/') {
      return NextResponse.redirect(new URL('/home', request.url))
    }
  } catch {
    return response
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|.*\\.png$|.*\\.svg$).*)'],
}
