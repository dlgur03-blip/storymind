// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabase()
    const { searchParams } = new URL(request.url)
    const section = searchParams.get('section') || 'trending' // trending, popular_authors, recommended
    const genre = searchParams.get('genre') || ''
    const limit = parseInt(searchParams.get('limit') || '20')
    const page = parseInt(searchParams.get('page') || '1')
    const offset = (page - 1) * limit

    const { data: { user } } = await supabase.auth.getUser()

    if (section === 'trending') {
      // Trending: score = total_likes * 2 + total_views, recent 7 days boosted
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

      if (genre) {
        query = query.eq('genre', genre)
      }

      const { data: stories, count } = await query
        .order('total_likes', { ascending: false })
        .range(offset, offset + limit - 1)

      // Calculate trending score and sort
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).getTime()
      const scored = (stories || []).map((s) => {
        const baseScore = (s.total_likes || 0) * 2 + (s.total_views || 0)
        const isRecent = new Date(s.updated_at).getTime() > sevenDaysAgo
        return {
          ...s,
          trendingScore: isRecent ? baseScore * 1.5 : baseScore,
        }
      }).sort((a, b) => b.trendingScore - a.trendingScore)

      // Check liked status
      let likedMap = {}
      if (user && scored.length > 0) {
        const storyIds = scored.map(s => s.id)
        const { data: likes } = await supabase
          .from('life_likes')
          .select('story_id')
          .eq('user_id', user.id)
          .in('story_id', storyIds)
        likedMap = Object.fromEntries((likes || []).map(l => [l.story_id, true]))
      }

      const feed = scored.map((s) => ({
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
        publishedChapters: s.total_chapters,
        recallMode: s.recall_mode || 'free',
        updatedAt: s.updated_at,
        readRequestStatus: user && s.user_id === user.id ? 'own' : null,
        isLiked: !!likedMap[s.id],
      }))

      return NextResponse.json({ stories: feed, page, hasMore: offset + limit < (count || 0) })
    }

    if (section === 'popular_authors') {
      const { data } = await supabase
        .from('life_profiles')
        .select('user_id, display_name, bio, avatar_url, total_stories, total_followers')
        .gt('total_stories', 0)
        .order('total_followers', { ascending: false })
        .limit(limit)

      const authors = (data || []).map((p) => ({
        userId: p.user_id,
        displayName: p.display_name,
        bio: p.bio || '',
        avatarUrl: p.avatar_url || '',
        totalStories: p.total_stories || 0,
        totalFollowers: p.total_followers || 0,
      }))

      return NextResponse.json({ authors })
    }

    if (section === 'recommended') {
      // Recommend authors the user doesn't follow yet
      if (!user) {
        return NextResponse.json({ authors: [] })
      }

      const { data: following } = await supabase
        .from('life_follows')
        .select('following_id')
        .eq('follower_id', user.id)

      const followingIds = (following || []).map(f => f.following_id)
      followingIds.push(user.id) // exclude self

      let query = supabase
        .from('life_profiles')
        .select('user_id, display_name, bio, avatar_url, total_stories, total_followers')
        .gt('total_stories', 0)
        .order('total_followers', { ascending: false })
        .limit(limit)

      if (followingIds.length > 0) {
        query = query.not('user_id', 'in', `(${followingIds.join(',')})`)
      }

      const { data } = await query

      const authors = (data || []).map((p) => ({
        userId: p.user_id,
        displayName: p.display_name,
        bio: p.bio || '',
        avatarUrl: p.avatar_url || '',
        totalStories: p.total_stories || 0,
        totalFollowers: p.total_followers || 0,
      }))

      return NextResponse.json({ authors })
    }

    // Popular tags
    if (section === 'popular_tags') {
      const { data } = await supabase
        .from('life_story_tags')
        .select('tag')
        .limit(500)

      const tagCounts: Record<string, number> = {}
      ;(data || []).forEach(t => {
        tagCounts[t.tag] = (tagCounts[t.tag] || 0) + 1
      })

      const tags = Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([tag, count]) => ({ tag, count }))

      return NextResponse.json({ tags })
    }

    return NextResponse.json({ error: 'Invalid section' }, { status: 400 })
  } catch (error) {
    console.error('Explore GET error:', error)
    return NextResponse.json({ error: '탐색 실패' }, { status: 500 })
  }
}
