// @ts-nocheck
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { addCredits, DAILY_FREE_CREDITS } from '@/lib/credits'

export async function POST() {
  try {
    const { user, supabase, error } = await getAuthUser()
    if (!user) return error

    // Check if already claimed today
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const { data: todayClaim } = await supabase
      .from('credit_transactions')
      .select('id')
      .eq('user_id', user.id)
      .eq('type', 'daily_free')
      .gte('created_at', todayStart.toISOString())
      .limit(1)

    if (todayClaim && todayClaim.length > 0) {
      return NextResponse.json({ error: '오늘의 무료 크레딧은 이미 수령했습니다', alreadyClaimed: true }, { status: 400 })
    }

    const newBalance = await addCredits(
      supabase,
      user.id,
      DAILY_FREE_CREDITS,
      'daily_free',
      `일일 무료 크레딧 ${DAILY_FREE_CREDITS}개 지급`
    )

    return NextResponse.json({
      message: `무료 크레딧 ${DAILY_FREE_CREDITS}개가 지급되었습니다!`,
      credited: DAILY_FREE_CREDITS,
      balance: newBalance,
    })
  } catch (error) {
    console.error('Daily credits error:', error)
    return NextResponse.json({ error: '일일 크레딧 수령 중 오류 발생' }, { status: 500 })
  }
}
