// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabase()
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    // Get current user (optional - for read request status)
    const { data: { user } } = await supabase.auth.getUser()

    // Get public stories that have at least one published chapter
    const { data: stories, count } = await supabase
      .from('life_stories')
      .select(`
        id, title, genre, description, status, user_id,
        total_likes, total_views, total_chapters,
        created_at, updated_at,
        life_profiles:user_id (display_name, avatar_url)
      `, { count: 'exact' })
      .eq('is_public', true)
      .gt('total_chapters', 0)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Get published chapter counts per story
    const storyIds = (stories || []).map(s => s.id)

    let publishedCounts = {}
    if (storyIds.length > 0) {
      const { data: chapters } = await supabase
        .from('life_chapters')
        .select('story_id')
        .in('story_id', storyIds)
        .eq('is_published', true)

      publishedCounts = (chapters || []).reduce((acc, ch) => {
        acc[ch.story_id] = (acc[ch.story_id] || 0) + 1
        return acc
      }, {})
    }

    // Get read request status for current user
    let requestStatusMap = {}
    if (user && storyIds.length > 0) {
      const { data: requests } = await supabase
        .from('life_read_requests')
        .select('story_id, status')
        .eq('requester_id', user.id)
        .in('story_id', storyIds)

      requestStatusMap = Object.fromEntries(
        (requests || []).map(r => [r.story_id, r.status])
      )
    }

    // Filter to only stories with published chapters
    const feed = (stories || [])
      .filter(s => (publishedCounts[s.id] || 0) > 0)
      .map((s) => ({
        id: s.id,
        title: s.title,
        genre: s.genre || '',
        description: s.description || '',
        status: s.status,
        authorId: s.user_id,
        authorName: s.life_profiles?.display_name || '익명',
        authorAvatar: s.life_profiles?.avatar_url || '',
        totalLikes: s.total_likes,
        totalViews: s.total_views,
        publishedChapters: publishedCounts[s.id] || 0,
        updatedAt: s.updated_at,
        // Read request status: null (not requested), 'pending', 'accepted', 'rejected'
        // 'own' if it's the user's own story
        readRequestStatus: user
          ? (s.user_id === user.id ? 'own' : (requestStatusMap[s.id] || null))
          : null,
      }))

    return NextResponse.json({
      feed,
      page,
      totalCount: count || 0,
      hasMore: offset + limit < (count || 0),
    })
  } catch (error) {
    console.error('Feed GET error:', error)
    return NextResponse.json({ error: '피드 조회 실패' }, { status: 500 })
  }
}
