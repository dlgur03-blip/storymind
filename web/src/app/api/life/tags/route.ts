// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

// GET: Get tags for a story, popular tags, or stories by tag
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabase()
    const { searchParams } = new URL(request.url)
    const storyId = searchParams.get('storyId')
    const tag = searchParams.get('tag')
    const popular = searchParams.get('popular')

    // Get tags for a specific story
    if (storyId) {
      const { data } = await supabase
        .from('life_story_tags')
        .select('tag')
        .eq('story_id', storyId)
        .order('created_at')

      return NextResponse.json({ tags: (data || []).map(t => t.tag) })
    }

    // Get popular tags
    if (popular !== null) {
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

    // Get stories by tag
    if (tag) {
      const { data: { user } } = await supabase.auth.getUser()

      const { data: taggedStories } = await supabase
        .from('life_story_tags')
        .select('story_id')
        .eq('tag', tag)
        .limit(50)

      const storyIds = (taggedStories || []).map(t => t.story_id)
      if (storyIds.length === 0) {
        return NextResponse.json({ stories: [] })
      }

      const { data: stories } = await supabase
        .from('life_stories')
        .select(`
          id, title, genre, description, status, user_id,
          total_likes, total_views, total_chapters, recall_mode,
          updated_at,
          life_profiles:user_id (display_name, avatar_url)
        `)
        .in('id', storyIds)
        .eq('is_public', true)
        .gt('total_chapters', 0)
        .order('total_likes', { ascending: false })

      const feed = (stories || []).map((s) => ({
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
      }))

      return NextResponse.json({ stories: feed })
    }

    return NextResponse.json({ error: 'Provide storyId, tag, or popular param' }, { status: 400 })
  } catch (error) {
    console.error('Tags GET error:', error)
    return NextResponse.json({ error: '태그 조회 실패' }, { status: 500 })
  }
}

// POST: Add tags to a story
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

    const { story_id, tags } = await request.json()
    if (!story_id || !Array.isArray(tags)) {
      return NextResponse.json({ error: 'story_id and tags array required' }, { status: 400 })
    }

    // Verify ownership
    const { data: story } = await supabase
      .from('life_stories')
      .select('user_id')
      .eq('id', story_id)
      .single()

    if (!story || story.user_id !== user.id) {
      return NextResponse.json({ error: '권한 없음' }, { status: 403 })
    }

    // Delete existing tags and insert new ones
    await supabase
      .from('life_story_tags')
      .delete()
      .eq('story_id', story_id)

    if (tags.length > 0) {
      const cleanTags = tags
        .map(t => t.trim().replace(/^#/, ''))
        .filter(t => t.length > 0)
        .slice(0, 10) // max 10 tags

      if (cleanTags.length > 0) {
        await supabase
          .from('life_story_tags')
          .insert(cleanTags.map(tag => ({ story_id, tag })))
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Tags POST error:', error)
    return NextResponse.json({ error: '태그 저장 실패' }, { status: 500 })
  }
}
