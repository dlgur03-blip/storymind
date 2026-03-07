// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { createServerSupabase } from '@/lib/supabase/server'

export async function GET(request: NextRequest, { params }: { params: Promise<{ storyId: string }> }) {
  try {
    const { storyId } = await params
    const supabase = await createServerSupabase()

    const { data: story } = await supabase
      .from('life_stories')
      .select('*')
      .eq('id', storyId)
      .single()

    if (!story) {
      return NextResponse.json({ error: '스토리를 찾을 수 없습니다' }, { status: 404 })
    }

    // Get author profile
    const { data: profile } = await supabase
      .from('life_profiles')
      .select('display_name, avatar_url')
      .eq('user_id', story.user_id)
      .single()

    // Get chapters
    const { data: chapters } = await supabase
      .from('life_chapters')
      .select('id, number, title, word_count, is_published, published_at, total_likes, total_comments, created_at')
      .eq('story_id', storyId)
      .order('number')

    // Increment view count
    await supabase
      .from('life_stories')
      .update({ total_views: (story.total_views || 0) + 1 })
      .eq('id', storyId)

    return NextResponse.json({
      story,
      author: profile || { display_name: '익명', avatar_url: '' },
      chapters: chapters || [],
    })
  } catch (error) {
    console.error('Story GET error:', error)
    return NextResponse.json({ error: '스토리 조회 실패' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ storyId: string }> }) {
  try {
    const { storyId } = await params
    const { user, supabase, error } = await getAuthUser()
    if (!user) return error

    const body = await request.json()
    const updates: Record<string, unknown> = {}
    if (body.title !== undefined) updates.title = body.title
    if (body.genre !== undefined) updates.genre = body.genre
    if (body.description !== undefined) updates.description = body.description
    if (body.is_public !== undefined) updates.is_public = body.is_public
    if (body.status !== undefined) updates.status = body.status
    if (body.cover_image_url !== undefined) updates.cover_image_url = body.cover_image_url
    if (body.recall_mode !== undefined) updates.recall_mode = body.recall_mode
    if (body.birth_year !== undefined) updates.birth_year = body.birth_year
    if (body.birth_place !== undefined) updates.birth_place = body.birth_place
    if (body.world_setting !== undefined) updates.world_setting = body.world_setting
    if (body.world_detail !== undefined) updates.world_detail = body.world_detail
    if (body.novel_style !== undefined) updates.novel_style = body.novel_style
    if (body.protagonist_name !== undefined) updates.protagonist_name = body.protagonist_name
    if (body.tone !== undefined) updates.tone = body.tone
    if (body.current_age !== undefined) updates.current_age = body.current_age

    const { data } = await supabase
      .from('life_stories')
      .update(updates)
      .eq('id', storyId)
      .eq('user_id', user.id)
      .select()
      .single()

    return NextResponse.json({ story: data })
  } catch (error) {
    console.error('Story PATCH error:', error)
    return NextResponse.json({ error: '스토리 수정 실패' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ storyId: string }> }) {
  try {
    const { storyId } = await params
    const { user, supabase, error } = await getAuthUser()
    if (!user) return error

    await supabase
      .from('life_stories')
      .delete()
      .eq('id', storyId)
      .eq('user_id', user.id)

    // Update profile story count
    const { count } = await supabase
      .from('life_stories')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
    await supabase
      .from('life_profiles')
      .update({ total_stories: count || 0 })
      .eq('user_id', user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Story DELETE error:', error)
    return NextResponse.json({ error: '스토리 삭제 실패' }, { status: 500 })
  }
}
