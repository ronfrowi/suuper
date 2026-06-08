import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

type CookieItem = { name: string; value: string; options: CookieOptions }

function cookieHandlers(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return {
    cookies: {
      getAll() { return cookieStore.getAll() },
      setAll(cookiesToSet: CookieItem[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch { /* no-op in Server Components */ }
      },
    },
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = ReturnType<typeof createServerClient<any>>

export async function createClient(): Promise<AnyClient> {
  const cookieStore = await cookies()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    cookieHandlers(cookieStore)
  )
}

export async function createServiceClient(): Promise<AnyClient> {
  const cookieStore = await cookies()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    cookieHandlers(cookieStore)
  )
}
