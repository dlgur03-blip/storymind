// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'

// GET: 특정 사용자와의 메시지 조회
export async function GET(request: NextRequest) {
  try {
    const { user, supabase, error } = await getAuthUser()
    if (!user) return error

    const partnerId = request.nextUrl.searchParams.get('partnerId')
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50')
    const before = request.nextUrl.searchParams.get('before') // cursor for pagination

    if (!partnerId) {
      return NextResponse.json({ error: 'partnerId 필수' }, { status: 400 })
    }

    let query = supabase
      .from('editor_messages')
      .select('*')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (before) {
      query = query.lt('created_at', before)
    }

    const { data, error: dbError } = await query

    if (dbError) throw dbError

    // 읽음 처리 (상대방이 보낸 메시지)
    await supabase
      .from('editor_messages')
      .update({ is_read: true })
      .eq('sender_id', partnerId)
      .eq('receiver_id', user.id)
      .eq('is_read', false)

    return NextResponse.json({ messages: (data || []).reverse() })
  } catch (error) {
    console.error('Messages GET error:', error)
    return NextResponse.json({ error: '메시지 조회 실패' }, { status: 500 })
  }
}

// POST: 메시지 전송
export async function POST(request: NextRequest) {
  try {
    const { user, supabase, error } = await getAuthUser()
    if (!user) return error

    const { receiverId, content, workId } = await request.json()

    if (!receiverId || !content?.trim()) {
      return NextResponse.json({ error: '수신자와 내용을 입력하세요' }, { status: 400 })
    }

    const { data, error: dbError } = await supabase
      .from('editor_messages')
      .insert({
        sender_id: user.id,
        receiver_id: receiverId,
        content: content.trim(),
        work_id: workId || null,
      })
      .select()
      .single()

    if (dbError) throw dbError

    // 알림 생성
    await supabase.from('life_notifications').insert({
      user_id: receiverId,
      type: 'editor_message',
      actor_id: user.id,
      message: '새 메시지가 도착했습니다',
    })

    return NextResponse.json({ message: data })
  } catch (error) {
    console.error('Messages POST error:', error)
    return NextResponse.json({ error: '메시지 전송 실패' }, { status: 500 })
  }
}
