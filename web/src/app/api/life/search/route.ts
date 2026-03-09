// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabase()
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')?.trim() || ''
    const type = searchParams.get('type') || 'all' // all, stories, users
    const limit = parseInt(searchParams.get('limit') || '20')

    if (!q) {
      return NextResponse.json({ stories: [], users: [] })
    }

    const { data: { user } } = await supabase.auth.getUser()

    let stories = []
    let users = []

    if (type === 'all' || type === 'stories') {
      const { data } = await supabase
        .from('life_stories')
        .select(`
          id, title, genre, description, status, user_id,
          total_likes, total_views, total_chapters, recall_mode,
          updated_at,
          life_profiles:user_id (display_name, avatar_url)
        `)
        .eq('is_public', true)
        .gt('total_chapters', 0)
        .ilike('title', `%${q}%`)
        .order('total_likes', { ascending: false })
        .limit(limit)

      stories = (data || []).map((s) => ({
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
    }

    if (type === 'all' || type === 'users') {
      const { data } = await supabase
        .from('life_profiles')
        .select('user_id, display_name, bio, avatar_url, total_stories, total_followers')
        .ilike('display_name', `%${q}%`)
        .order('total_followers', { ascending: false })
        .limit(limit)

      users = (data || []).map((p) => ({
        userId: p.user_id,
        displayName: p.display_name,
        bio: p.bio || '',
        avatarUrl: p.avatar_url || '',
        totalStories: p.total_stories || 0,
        totalFollowers: p.total_followers || 0,
      }))
    }

    return NextResponse.json({ stories, users })
  } catch (error) {
    console.error('Search GET error:', error)
    return NextResponse.json({ error: '검색 실패' }, { status: 500 })
  }
}
