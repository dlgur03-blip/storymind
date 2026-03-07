// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { createServerSupabase } from '@/lib/supabase/server'

export async function GET(request: NextRequest, { params }: { params: Promise<{ storyId: string; chapterId: string }> }) {
  try {
    const { chapterId } = await params
    const supabase = await createServerSupabase()

    const { data } = await supabase
      .from('life_chapters')
      .select('*')
      .eq('id', chapterId)
      .single()

    if (!data) {
      return NextResponse.json({ error: '챕터를 찾을 수 없습니다' }, { status: 404 })
    }

    return NextResponse.json({ chapter: data })
  } catch (error) {
    console.error('Chapter GET error:', error)
    return NextResponse.json({ error: '챕터 조회 실패' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ storyId: string; chapterId: string }> }) {
  try {
    const { storyId, chapterId } = await params
    const { user, supabase, error } = await getAuthUser()
    if (!user) return error

    // Verify ownership
    const { data: story } = await supabase
      .from('life_stories')
      .select('id')
      .eq('id', storyId)
      .eq('user_id', user.id)
      .single()

    if (!story) {
      return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 })
    }

    const body = await request.json()
    const updates: Record<string, unknown> = {}
    if (body.title !== undefined) updates.title = body.title
    if (body.content !== undefined) updates.content = body.content
    if (body.conversation_history !== undefined) updates.conversation_history = body.conversation_history
    if (body.recall_age !== undefined) updates.recall_age = body.recall_age
    if (body.recall_year !== undefined) updates.recall_year = body.recall_year
    if (body.is_skipped !== undefined) updates.is_skipped = body.is_skipped
    if (body.is_published !== undefined) {
      updates.is_published = body.is_published
      if (body.is_published) updates.published_at = new Date().toISOString()
    }

    const { data } = await supabase
      .from('life_chapters')
      .update(updates)
      .eq('id', chapterId)
      .select()
      .single()

    // Update streak on publish
    if (body.is_published && data) {
      try {
        const today = new Date().toISOString().split('T')[0]
        const { data: streak } = await supabase
          .from('life_streaks')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (streak) {
          const lastDate = streak.last_write_date
          const isConsecutive = lastDate && (
            new Date(today).getTime() - new Date(lastDate).getTime() <= 86400000
          )
          const isSameDay = lastDate === today

          if (!isSameDay) {
            const newStreak = isConsecutive ? streak.current_streak + 1 : 1
            await supabase.from('life_streaks').update({
              current_streak: newStreak,
              longest_streak: Math.max(newStreak, streak.longest_streak),
              last_write_date: today,
              total_write_days: streak.total_write_days + 1,
              updated_at: new Date().toISOString(),
            }).eq('user_id', user.id)
          }
        } else {
          await supabase.from('life_streaks').insert({
            user_id: user.id,
            current_streak: 1,
            longest_streak: 1,
            last_write_date: today,
            total_write_days: 1,
          })
        }
      } catch (e) {
        console.error('Streak update error:', e)
      }
    }

    return NextResponse.json({ chapter: data })
  } catch (error) {
    console.error('Chapter PATCH error:', error)
    return NextResponse.json({ error: '챕터 수정 실패' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ storyId: string; chapterId: string }> }) {
  try {
    const { storyId, chapterId } = await params
    const { user, supabase, error } = await getAuthUser()
    if (!user) return error

    // Verify ownership
    const { data: story } = await supabase
      .from('life_stories')
      .select('id')
      .eq('id', storyId)
      .eq('user_id', user.id)
      .single()

    if (!story) {
      return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 })
    }

    await supabase
      .from('life_chapters')
      .delete()
      .eq('id', chapterId)

    // Update chapter count
    const { count } = await supabase
      .from('life_chapters')
      .select('*', { count: 'exact', head: true })
      .eq('story_id', storyId)

    await supabase
      .from('life_stories')
      .update({ total_chapters: count || 0 })
      .eq('id', storyId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Chapter DELETE error:', error)
    return NextResponse.json({ error: '챕터 삭제 실패' }, { status: 500 })
  }
}
