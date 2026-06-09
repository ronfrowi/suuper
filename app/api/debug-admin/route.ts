import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'not logged in', userError })

  const serviceClient = await createServiceClient()
  const { data: profile, error: profileError } = await serviceClient
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  return NextResponse.json({ userId: user.id, email: user.email, profile, profileError })
}
