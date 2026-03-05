// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { user, supabase, error } = await getAuthUser()
    if (!user) return error

    const { target_user_id } = await request.json()

    if (!target_user_id || target_user_id === user.id) {
      return NextResponse.json({ error: '잘못된 요청' }, { status: 400 })
    }

    // Check existing follow
    const { data: existing } = await supabase
      .from('life_follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', target_user_id)
      .maybeSingle()

    if (existing) {
      // Unfollow
      await supabase.from('life_follows').delete().eq('id', existing.id)

      // Update counters
      const { data: myProfile } = await supabase.from('life_profiles').select('total_following').eq('user_id', user.id).single()
      await supabase.from('life_profiles').update({ total_following: Math.max(0, (myProfile?.total_following || 1) - 1) }).eq('user_id', user.id)

      const { data: targetProfile } = await supabase.from('life_profiles').select('total_followers').eq('user_id', target_user_id).single()
      await supabase.from('life_profiles').update({ total_followers: Math.max(0, (targetProfile?.total_followers || 1) - 1) }).eq('user_id', target_user_id)

      return NextResponse.json({ following: false })
    } else {
      // Follow
      await supabase.from('life_follows').insert({
        follower_id: user.id,
        following_id: target_user_id,
      })

      // Update counters
      const { data: myProfile } = await supabase.from('life_profiles').select('total_following').eq('user_id', user.id).single()
      await supabase.from('life_profiles').update({ total_following: (myProfile?.total_following || 0) + 1 }).eq('user_id', user.id)

      const { data: targetProfile } = await supabase.from('life_profiles').select('total_followers').eq('user_id', target_user_id).single()
      await supabase.from('life_profiles').update({ total_followers: (targetProfile?.total_followers || 0) + 1 }).eq('user_id', target_user_id)

      // Notify
      await supabase.from('life_notifications').insert({
        user_id: target_user_id,
        type: 'follow',
        actor_id: user.id,
        message: '회원님을 팔로우하기 시작했습니다',
      })

      return NextResponse.json({ following: true })
    }
  } catch (error) {
    console.error('Follow error:', error)
    return NextResponse.json({ error: '팔로우 처리 실패' }, { status: 500 })
  }
}
