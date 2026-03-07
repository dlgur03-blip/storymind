// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { BADGE_META } from '@/lib/badge-checker'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const targetUserId = searchParams.get('userId')

    const { user, supabase, error } = await getAuthUser()
    if (!user) return error

    const userId = targetUserId || user.id

    const { data } = await supabase
      .from('life_badges')
      .select('*')
      .eq('user_id', userId)
      .order('earned_at', { ascending: false })

    const badges = (data || []).map((b) => ({
      ...b,
      meta: BADGE_META[b.badge_type] || { name: b.badge_type, description: '', icon: '🏅' },
    }))

    return NextResponse.json({ badges })
  } catch (error) {
    console.error('Badges GET error:', error)
    return NextResponse.json({ error: '뱃지 조회 실패' }, { status: 500 })
  }
}
