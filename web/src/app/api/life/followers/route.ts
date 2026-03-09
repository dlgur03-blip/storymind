// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabase()
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const type = searchParams.get('type') || 'followers' // followers, following
    const limit = parseInt(searchParams.get('limit') || '50')

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    if (type === 'followers') {
      const { data } = await supabase
        .from('life_follows')
        .select(`
          follower_id,
          life_profiles:follower_id (user_id, display_name, bio, avatar_url, total_stories, total_followers)
        `)
        .eq('following_id', userId)
        .limit(limit)

      const followers = (data || [])
        .filter(f => f.life_profiles)
        .map((f) => ({
          userId: f.life_profiles.user_id,
          displayName: f.life_profiles.display_name,
          bio: f.life_profiles.bio || '',
          avatarUrl: f.life_profiles.avatar_url || '',
          totalStories: f.life_profiles.total_stories || 0,
          totalFollowers: f.life_profiles.total_followers || 0,
        }))

      return NextResponse.json({ users: followers })
    }

    if (type === 'following') {
      const { data } = await supabase
        .from('life_follows')
        .select(`
          following_id,
          life_profiles:following_id (user_id, display_name, bio, avatar_url, total_stories, total_followers)
        `)
        .eq('follower_id', userId)
        .limit(limit)

      const following = (data || [])
        .filter(f => f.life_profiles)
        .map((f) => ({
          userId: f.life_profiles.user_id,
          displayName: f.life_profiles.display_name,
          bio: f.life_profiles.bio || '',
          avatarUrl: f.life_profiles.avatar_url || '',
          totalStories: f.life_profiles.total_stories || 0,
          totalFollowers: f.life_profiles.total_followers || 0,
        }))

      return NextResponse.json({ users: following })
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  } catch (error) {
    console.error('Followers GET error:', error)
    return NextResponse.json({ error: '팔로워 조회 실패' }, { status: 500 })
  }
}
