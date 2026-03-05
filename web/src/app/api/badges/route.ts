// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'

const BADGE_DEFINITIONS = {
  first_work: { name: '첫 작품', description: '첫 번째 작품 생성', icon: '📖' },
  first_chapter: { name: '첫 챕터', description: '첫 번째 챕터 작성', icon: '✍️' },
  word_1000: { name: '천 자 돌파', description: '1,000자 작성', icon: '📝' },
  word_10000: { name: '만 자 돌파', description: '10,000자 작성', icon: '📚' },
  word_100000: { name: '십만 자 돌파', description: '100,000자 작성', icon: '🏆' },
  review_10: { name: '검수 마스터', description: 'AI 검수 10회 사용', icon: '🔍' },
  streak_7: { name: '7일 연속', description: '7일 연속 집필', icon: '🔥' },
  streak_30: { name: '30일 연속', description: '30일 연속 집필', icon: '💎' },
  planner_complete: { name: '기획 완료', description: '스토리 기획 완료', icon: '🗺️' },
  referral_1: { name: '추천인', description: '첫 번째 친구 추천', icon: '🤝' },
}

export async function GET() {
  try {
    const { user, supabase, error } = await getAuthUser()
    if (!user) return error

    const { data: badges } = await supabase
      .from('badges')
      .select('*')
      .eq('user_id', user.id)
      .order('earned_at', { ascending: false })

    const earned = (badges || []).map(b => b.badge_type)

    const allBadges = Object.entries(BADGE_DEFINITIONS).map(([type, def]) => ({
      type,
      ...def,
      earned: earned.includes(type),
      earnedAt: badges?.find(b => b.badge_type === type)?.earned_at || null,
    }))

    return NextResponse.json({ badges: allBadges })
  } catch (error) {
    console.error('Badges error:', error)
    return NextResponse.json({ error: '뱃지 조회 중 오류 발생' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, supabase, error } = await getAuthUser()
    if (!user) return error

    const { badgeType } = await request.json()
    if (!badgeType || !BADGE_DEFINITIONS[badgeType]) {
      return NextResponse.json({ error: '유효하지 않은 뱃지 타입' }, { status: 400 })
    }

    const { data: existing } = await supabase
      .from('badges')
      .select('id')
      .eq('user_id', user.id)
      .eq('badge_type', badgeType)
      .single()

    if (existing) {
      return NextResponse.json({ message: '이미 획득한 뱃지입니다', badge: existing })
    }

    const { data: badge, error: insertError } = await supabase
      .from('badges')
      .insert({
        user_id: user.id,
        badge_type: badgeType,
        badge_name: BADGE_DEFINITIONS[badgeType].name,
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 })
    }

    return NextResponse.json({ badge, message: `${BADGE_DEFINITIONS[badgeType].name} 뱃지를 획득했습니다!` })
  } catch (error) {
    console.error('Badge grant error:', error)
    return NextResponse.json({ error: '뱃지 부여 중 오류 발생' }, { status: 500 })
  }
}
