// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'

export async function GET() {
  try {
    const { user, supabase, error } = await getAuthUser()
    if (!user) return error

    const { data } = await supabase
      .from('life_notifications')
      .select(`
        *,
        life_profiles:actor_id (display_name, avatar_url)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    const notifications = (data || []).map((n) => ({
      ...n,
      actorName: n.life_profiles?.display_name || '알 수 없음',
      actorAvatar: n.life_profiles?.avatar_url || '',
    }))

    return NextResponse.json({ notifications })
  } catch (error) {
    console.error('Notifications GET error:', error)
    return NextResponse.json({ error: '알림 조회 실패' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { user, supabase, error } = await getAuthUser()
    if (!user) return error

    const { markAllRead } = await request.json()

    if (markAllRead) {
      await supabase
        .from('life_notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Notifications PATCH error:', error)
    return NextResponse.json({ error: '알림 처리 실패' }, { status: 500 })
  }
}
