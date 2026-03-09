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
    const filter = searchParams.get('filter') || 'all' // all, following
    const genre = searchParams.get('genre') || ''
    const sort = searchParams.get('sort') || 'recent' // recent, trending

    // Get current user (optional - for read request status)
    const { data: { user } } = await supabase.auth.getUser()

    // If following filter, get following IDs
    let followingIds: string[] = []
    if (filter === 'following' && user) {
      const { data: follows } = await supabase
        .from('life_follows')
        .select('following_id')
        .eq('follower_id', user.id)

      followingIds = (follows || []).map(f => f.following_id)
      if (followingIds.length === 0) {
        return NextResponse.json({ feed: [], page, totalCount: 0, hasMore: false })
      }
    }

    // Build query
    let query = supabase
      .from('life_stories')
      .select(`
        id, title, genre, description, status, user_id,
        total_likes, total_views, total_chapters, recall_mode,
        created_at, updated_at,
        life_profiles:user_id (display_name, avatar_url)
      `, { count: 'exact' })
      .eq('is_public', true)
      .gt('total_chapters', 0)

    if (filter === 'following' && followingIds.length > 0) {
      query = query.in('user_id', followingIds)
    }

    if (genre) {
      query = query.eq('genre', genre)
    }

    if (sort === 'trending') {
      query = query.order('total_likes', { ascending: false })
    } else {
      query = query.order('updated_at', { ascending: false })
    }

    const { data: stories, count } = await query.range(offset, offset + limit - 1)

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
    let likedMap = {}
    if (user && storyIds.length > 0) {
      const { data: requests } = await supabase
        .from('life_read_requests')
        .select('story_id, status')
        .eq('requester_id', user.id)
        .in('story_id', storyIds)

      requestStatusMap = Object.fromEntries(
        (requests || []).map(r => [r.story_id, r.status])
      )

      // Get liked status
      const { data: likes } = await supabase
        .from('life_likes')
        .select('story_id')
        .eq('user_id', user.id)
        .in('story_id', storyIds)

      likedMap = Object.fromEntries(
        (likes || []).map(l => [l.story_id, true])
      )
    }

    // Filter to only stories with published chapters
    let feed = (stories || [])
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
        recallMode: s.recall_mode || 'free',
        updatedAt: s.updated_at,
        readRequestStatus: user
          ? (s.user_id === user.id ? 'own' : (requestStatusMap[s.id] || null))
          : null,
        isLiked: !!likedMap[s.id],
      }))

    // Apply trending sort with recency boost
    if (sort === 'trending') {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).getTime()
      feed = feed.sort((a, b) => {
        const scoreA = (a.totalLikes * 2 + a.totalViews) * (new Date(a.updatedAt).getTime() > sevenDaysAgo ? 1.5 : 1)
        const scoreB = (b.totalLikes * 2 + b.totalViews) * (new Date(b.updatedAt).getTime() > sevenDaysAgo ? 1.5 : 1)
        return scoreB - scoreA
      })
    }

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
