// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const { user, supabase, error } = await getAuthUser()
    if (!user) return error

    const days = parseInt(request.nextUrl.searchParams.get('days') || '7')
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const { data: stats } = await supabase
      .from('daily_stats')
      .select('date, word_count')
      .eq('user_id', user.id)
      .gte('date', startDate)
      .order('date')

    // Fill missing dates
    const result: Array<{ date: string; word_count: number }> = []
    for (let i = 0; i < days; i++) {
      const d = new Date(Date.now() - (days - 1 - i) * 24 * 60 * 60 * 1000)
      const dateStr = d.toISOString().split('T')[0]
      const existing = stats?.find(s => s.date === dateStr)
      result.push({ date: dateStr, word_count: existing?.word_count || 0 })
    }

    const today = new Date().toISOString().split('T')[0]
    const todayCount = result.find(r => r.date === today)?.word_count || 0
    const totalWeek = result.reduce((sum, r) => sum + r.word_count, 0)

    return NextResponse.json({
      stats: result,
      today: todayCount,
      totalWeek,
      avgDaily: Math.round(totalWeek / days),
    })
  } catch (error) {
    console.error('Stats error:', error)
    return NextResponse.json({ error: '통계 조회 중 오류 발생' }, { status: 500 })
  }
}
