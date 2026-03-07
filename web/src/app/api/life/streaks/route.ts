// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'

export async function GET() {
  try {
    const { user, supabase, error } = await getAuthUser()
    if (!user) return error

    const { data } = await supabase
      .from('life_streaks')
      .select('*')
      .eq('user_id', user.id)
      .single()

    return NextResponse.json({ streak: data || { current_streak: 0, longest_streak: 0, total_write_days: 0, last_write_date: null } })
  } catch (error) {
    console.error('Streaks GET error:', error)
    return NextResponse.json({ error: '스트릭 조회 실패' }, { status: 500 })
  }
}
