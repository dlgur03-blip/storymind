// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { createServerSupabase } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabase()
    const { searchParams } = new URL(request.url)
    const chapterId = searchParams.get('chapterId')

    if (!chapterId) {
      return NextResponse.json({ error: 'chapterId 필요' }, { status: 400 })
    }

    const { data } = await supabase
      .from('life_comments')
      .select(`
        id, content, parent_id, is_deleted, created_at, updated_at,
        user_id,
        life_profiles:user_id (display_name, avatar_url)
      `)
      .eq('chapter_id', chapterId)
      .order('created_at', { ascending: true })

    const comments = (data || []).map((c) => ({
      ...c,
      authorName: c.life_profiles?.display_name || '익명',
      authorAvatar: c.life_profiles?.avatar_url || '',
    }))

    return NextResponse.json({ comments })
  } catch (error) {
    console.error('Comments GET error:', error)
    return NextResponse.json({ error: '댓글 조회 실패' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, supabase, error } = await getAuthUser()
    if (!user) return error

    const { chapter_id, content, parent_id } = await request.json()

    if (!chapter_id || !content?.trim()) {
      return NextResponse.json({ error: '내용을 입력하세요' }, { status: 400 })
    }

    const { data, error: dbError } = await supabase
      .from('life_comments')
      .insert({
        user_id: user.id,
        chapter_id,
        content: content.trim(),
        parent_id: parent_id || null,
      })
      .select()
      .single()

    if (dbError) throw dbError

    // Update comment count
    const { data: ch } = await supabase.from('life_chapters').select('total_comments, story_id').eq('id', chapter_id).single()
    await supabase.from('life_chapters').update({ total_comments: (ch?.total_comments || 0) + 1 }).eq('id', chapter_id)

    // Notify chapter author
    if (ch?.story_id) {
      const { data: s } = await supabase.from('life_stories').select('user_id').eq('id', ch.story_id).single()
      if (s?.user_id && s.user_id !== user.id) {
        await supabase.from('life_notifications').insert({
          user_id: s.user_id,
          type: 'comment',
          actor_id: user.id,
          chapter_id,
          message: '회원님의 챕터에 댓글을 남겼습니다',
        })
      }
    }

    // Notify parent comment author (for replies)
    if (parent_id) {
      const { data: parentComment } = await supabase.from('life_comments').select('user_id').eq('id', parent_id).single()
      if (parentComment?.user_id && parentComment.user_id !== user.id) {
        await supabase.from('life_notifications').insert({
          user_id: parentComment.user_id,
          type: 'comment',
          actor_id: user.id,
          chapter_id,
          message: '회원님의 댓글에 답글을 남겼습니다',
        })
      }
    }

    return NextResponse.json({ comment: data })
  } catch (error) {
    console.error('Comments POST error:', error)
    return NextResponse.json({ error: '댓글 작성 실패' }, { status: 500 })
  }
}
