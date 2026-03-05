// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'

// GET: 챕터 코멘트 목록
export async function GET(request: NextRequest) {
  try {
    const { user, supabase, error } = await getAuthUser()
    if (!user) return error

    const chapterId = request.nextUrl.searchParams.get('chapterId')
    const workId = request.nextUrl.searchParams.get('workId')
    const status = request.nextUrl.searchParams.get('status') // 'open' | 'resolved' | null (all)

    if (!workId) {
      return NextResponse.json({ error: 'workId 필수' }, { status: 400 })
    }

    let query = supabase
      .from('chapter_comments')
      .select('*')
      .eq('work_id', workId)
      .order('created_at', { ascending: true })

    if (chapterId) {
      query = query.eq('chapter_id', chapterId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error: dbError } = await query

    if (dbError) throw dbError

    // 사용자 프로필 정보 첨부
    const userIds = [...new Set((data || []).map(c => c.user_id))]
    let profiles = []
    if (userIds.length > 0) {
      const { data: p } = await supabase
        .from('life_profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds)
      profiles = p || []
    }

    const comments = (data || []).map(c => ({
      ...c,
      author: profiles.find(p => p.user_id === c.user_id) || { display_name: '알 수 없음' },
    }))

    return NextResponse.json({ comments })
  } catch (error) {
    console.error('Comments GET error:', error)
    return NextResponse.json({ error: '코멘트 조회 실패' }, { status: 500 })
  }
}

// POST: 코멘트 작성
export async function POST(request: NextRequest) {
  try {
    const { user, supabase, error } = await getAuthUser()
    if (!user) return error

    const { chapterId, workId, content, selectionStart, selectionEnd, selectedText, parentId } = await request.json()

    if (!chapterId || !workId || !content?.trim()) {
      return NextResponse.json({ error: '필수 정보가 없습니다' }, { status: 400 })
    }

    const { data, error: dbError } = await supabase
      .from('chapter_comments')
      .insert({
        chapter_id: chapterId,
        work_id: workId,
        user_id: user.id,
        content: content.trim(),
        selection_start: selectionStart ?? null,
        selection_end: selectionEnd ?? null,
        selected_text: selectedText || null,
        parent_id: parentId || null,
        status: 'open',
      })
      .select()
      .single()

    if (dbError) throw dbError

    // 작품 소유자에게 알림
    const { data: work } = await supabase
      .from('works')
      .select('user_id, title')
      .eq('id', workId)
      .single()

    if (work && work.user_id !== user.id) {
      await supabase.from('life_notifications').insert({
        user_id: work.user_id,
        type: 'editor_comment',
        actor_id: user.id,
        work_id_ref: workId,
        chapter_id: chapterId,
        message: `"${work.title}"에 편집자 코멘트가 추가되었습니다`,
      })
    }

    // 부모 코멘트 작성자에게도 알림 (답글인 경우)
    if (parentId) {
      const { data: parent } = await supabase
        .from('chapter_comments')
        .select('user_id')
        .eq('id', parentId)
        .single()

      if (parent && parent.user_id !== user.id) {
        await supabase.from('life_notifications').insert({
          user_id: parent.user_id,
          type: 'editor_comment',
          actor_id: user.id,
          work_id_ref: workId,
          message: '코멘트에 답글이 달렸습니다',
        })
      }
    }

    return NextResponse.json({ comment: data })
  } catch (error) {
    console.error('Comments POST error:', error)
    return NextResponse.json({ error: '코멘트 작성 실패' }, { status: 500 })
  }
}

// PATCH: 코멘트 수정 또는 해결 처리
export async function PATCH(request: NextRequest) {
  try {
    const { user, supabase, error } = await getAuthUser()
    if (!user) return error

    const { commentId, content, status } = await request.json()

    if (!commentId) {
      return NextResponse.json({ error: 'commentId 필수' }, { status: 400 })
    }

    const updateData: any = {}
    if (content !== undefined) updateData.content = content.trim()
    if (status !== undefined) updateData.status = status

    const { data, error: dbError } = await supabase
      .from('chapter_comments')
      .update(updateData)
      .eq('id', commentId)
      .select()
      .single()

    if (dbError) throw dbError

    return NextResponse.json({ comment: data })
  } catch (error) {
    console.error('Comments PATCH error:', error)
    return NextResponse.json({ error: '코멘트 수정 실패' }, { status: 500 })
  }
}

// DELETE: 코멘트 삭제
export async function DELETE(request: NextRequest) {
  try {
    const { user, supabase, error } = await getAuthUser()
    if (!user) return error

    const commentId = request.nextUrl.searchParams.get('commentId')
    if (!commentId) {
      return NextResponse.json({ error: 'commentId 필수' }, { status: 400 })
    }

    await supabase
      .from('chapter_comments')
      .delete()
      .eq('id', commentId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Comments DELETE error:', error)
    return NextResponse.json({ error: '코멘트 삭제 실패' }, { status: 500 })
  }
}
