// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = 'SM-'
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export async function GET() {
  try {
    const { user, supabase, error } = await getAuthUser()
    if (!user) return error

    // Get or create referral code
    let { data: referral } = await supabase
      .from('referrals')
      .select('*')
      .eq('referrer_id', user.id)
      .is('referred_id', null)
      .single()

    if (!referral) {
      const { data: newRef } = await supabase
        .from('referrals')
        .insert({
          referrer_id: user.id,
          referral_code: generateCode(),
        })
        .select()
        .single()
      referral = newRef
    }

    // Get referral stats
    const { data: allReferrals } = await supabase
      .from('referrals')
      .select('*')
      .eq('referrer_id', user.id)

    const completedCount = (allReferrals || []).filter(r => r.status === 'completed').length

    return NextResponse.json({
      code: referral?.referral_code || '',
      totalReferred: completedCount,
      referrals: (allReferrals || []).map(r => ({
        code: r.referral_code,
        status: r.status,
        rewardGiven: r.reward_given,
        createdAt: r.created_at,
      })),
    })
  } catch (error) {
    console.error('Referral error:', error)
    return NextResponse.json({ error: '추천 코드 조회 중 오류 발생' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, supabase, error } = await getAuthUser()
    if (!user) return error

    const { code } = await request.json()
    if (!code) {
      return NextResponse.json({ error: '추천 코드를 입력해주세요' }, { status: 400 })
    }

    // Find the referral code
    const { data: referral } = await supabase
      .from('referrals')
      .select('*')
      .eq('referral_code', code.toUpperCase())
      .is('referred_id', null)
      .single()

    if (!referral) {
      return NextResponse.json({ error: '유효하지 않거나 이미 사용된 추천 코드입니다' }, { status: 400 })
    }

    if (referral.referrer_id === user.id) {
      return NextResponse.json({ error: '본인의 추천 코드는 사용할 수 없습니다' }, { status: 400 })
    }

    // Apply referral
    await supabase
      .from('referrals')
      .update({
        referred_id: user.id,
        status: 'completed',
      })
      .eq('id', referral.id)

    // Create a new code for the referrer
    await supabase
      .from('referrals')
      .insert({
        referrer_id: referral.referrer_id,
        referral_code: generateCode(),
      })

    return NextResponse.json({ message: '추천 코드가 적용되었습니다!' })
  } catch (error) {
    console.error('Referral apply error:', error)
    return NextResponse.json({ error: '추천 코드 적용 중 오류 발생' }, { status: 500 })
  }
}
