// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'

// GET: 이메일로 사용자 검색 (초대용)
export async function GET(request: NextRequest) {
  try {
    const { user, supabase, error } = await getAuthUser()
    if (!user) return error

    const email = request.nextUrl.searchParams.get('email')
    if (!email || !email.trim()) {
      return NextResponse.json({ error: '이메일을 입력하세요' }, { status: 400 })
    }

    // life_profiles에서 display_name 검색, 또는 auth.users에서 이메일로 검색
    // Supabase에서는 auth.users를 직접 쿼리할 수 없으므로 RPC 사용하거나
    // life_profiles에서 검색
    const { data: profiles } = await supabase
      .from('life_profiles')
      .select('user_id, display_name, avatar_url')
      .ilike('display_name', `%${email.trim()}%`)
      .limit(10)

    // 자기 자신 제외
    const filtered = (profiles || []).filter(p => p.user_id !== user.id)

    return NextResponse.json({ users: filtered })
  } catch (error) {
    console.error('Find user error:', error)
    return NextResponse.json({ error: '사용자 검색 실패' }, { status: 500 })
  }
}
