// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'

// GET: 대화 목록 (최근 메시지 + 안읽은 수)
export async function GET(request: NextRequest) {
  try {
    const { user, supabase, error } = await getAuthUser()
    if (!user) return error

    // 내가 보내거나 받은 모든 메시지에서 대화 상대 추출
    const { data: sent } = await supabase
      .from('editor_messages')
      .select('receiver_id, content, created_at, is_read')
      .eq('sender_id', user.id)
      .order('created_at', { ascending: false })

    const { data: received } = await supabase
      .from('editor_messages')
      .select('sender_id, content, created_at, is_read')
      .eq('receiver_id', user.id)
      .order('created_at', { ascending: false })

    // 대화 상대별 최근 메시지와 안읽은 수 집계
    const convMap = new Map()

    for (const msg of (sent || [])) {
      const pid = msg.receiver_id
      if (!convMap.has(pid) || new Date(msg.created_at) > new Date(convMap.get(pid).lastAt)) {
        convMap.set(pid, {
          partnerId: pid,
          lastMessage: msg.content,
          lastAt: msg.created_at,
          unread: convMap.get(pid)?.unread || 0,
        })
      }
    }

    for (const msg of (received || [])) {
      const pid = msg.sender_id
      const existing = convMap.get(pid)
      const unread = (existing?.unread || 0) + (msg.is_read ? 0 : 1)

      if (!existing || new Date(msg.created_at) > new Date(existing.lastAt)) {
        convMap.set(pid, {
          partnerId: pid,
          lastMessage: msg.content,
          lastAt: msg.created_at,
          unread,
        })
      } else {
        convMap.set(pid, { ...existing, unread })
      }
    }

    const conversations = [...convMap.values()].sort(
      (a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime()
    )

    // 프로필 정보 첨부
    const partnerIds = conversations.map(c => c.partnerId)
    let profiles = []
    if (partnerIds.length > 0) {
      const { data: p } = await supabase
        .from('life_profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', partnerIds)
      profiles = p || []
    }

    const result = conversations.map(c => ({
      ...c,
      partner: profiles.find(p => p.user_id === c.partnerId) || { display_name: '알 수 없음' },
    }))

    return NextResponse.json({ conversations: result })
  } catch (error) {
    console.error('Conversations GET error:', error)
    return NextResponse.json({ error: '대화 목록 조회 실패' }, { status: 500 })
  }
}
