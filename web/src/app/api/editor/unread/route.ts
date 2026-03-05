// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'

// GET: 안읽은 코멘트/메시지 수
export async function GET(request: NextRequest) {
  try {
    const { user, supabase, error } = await getAuthUser()
    if (!user) return error

    // 안읽은 메시지 수
    const { count: unreadMessages } = await supabase
      .from('editor_messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', user.id)
      .eq('is_read', false)

    // 내 작품에 달린 미해결 코멘트 수
    const { data: myWorks } = await supabase
      .from('works')
      .select('id')
      .eq('user_id', user.id)

    let unreadComments = 0
    if (myWorks && myWorks.length > 0) {
      const workIds = myWorks.map(w => w.id)
      const { count } = await supabase
        .from('chapter_comments')
        .select('*', { count: 'exact', head: true })
        .in('work_id', workIds)
        .eq('status', 'open')
        .neq('user_id', user.id)
      unreadComments = count || 0
    }

    return NextResponse.json({
      unreadMessages: unreadMessages || 0,
      unreadComments,
      total: (unreadMessages || 0) + unreadComments,
    })
  } catch (error) {
    console.error('Unread GET error:', error)
    return NextResponse.json({ error: '조회 실패' }, { status: 500 })
  }
}
