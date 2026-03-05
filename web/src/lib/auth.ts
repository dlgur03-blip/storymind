import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

export async function getAuthUser() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, supabase, error: NextResponse.json({ error: '인증 필요' }, { status: 401 }) }
  return { user, supabase, error: null }
}
