// @ts-nocheck
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'

const ADMIN_EMAILS = ['dlgur03@gmail.com']

export async function GET() {
  try {
    const { user, supabase, error } = await getAuthUser()
    if (!user) return error

    if (!ADMIN_EMAILS.includes(user.email || '')) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
    }

    // Total users
    const { count: totalUsers } = await supabase
      .from('works')
      .select('user_id', { count: 'exact', head: true })

    // Total works
    const { count: totalWorks } = await supabase
      .from('works')
      .select('*', { count: 'exact', head: true })

    // Total chapters
    const { count: totalChapters } = await supabase
      .from('chapters')
      .select('*', { count: 'exact', head: true })

    // Today's stats (daily_stats table may not exist)
    const today = new Date().toISOString().split('T')[0]
    let todayTotal = 0
    let activeToday = 0
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const dailyTrend = {}
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      dailyTrend[d] = { date: d, totalWords: 0, activeUsers: 0 }
    }

    try {
      const { data: todayStats, error: todayErr } = await supabase
        .from('daily_stats')
        .select('word_count')
        .eq('date', today)

      if (!todayErr && todayStats) {
        todayTotal = todayStats.reduce((sum, s) => sum + (s.word_count || 0), 0)
        activeToday = todayStats.length

        // Last 7 days daily trend
        const { data: weekStats, error: weekErr } = await supabase
          .from('daily_stats')
          .select('date, word_count')
          .gte('date', weekAgo)
          .order('date')

        if (!weekErr) {
          for (const s of weekStats || []) {
            if (dailyTrend[s.date]) {
              dailyTrend[s.date].totalWords += s.word_count || 0
              dailyTrend[s.date].activeUsers += 1
            }
          }
        }
      }
    } catch (e) {
      console.warn('daily_stats table may not exist:', e)
    }

    // API usage cost estimate (api_usage table may not exist)
    let totalCost = 0
    const endpointBreakdown = {}
    try {
      const { data: apiUsage, error: apiErr } = await supabase
        .from('api_usage')
        .select('endpoint, tokens_in, tokens_out, cost_estimate')
        .gte('created_at', weekAgo)

      if (!apiErr && apiUsage) {
        totalCost = apiUsage.reduce((sum, u) => sum + (u.cost_estimate || 0), 0)
        for (const u of apiUsage) {
          if (!endpointBreakdown[u.endpoint]) {
            endpointBreakdown[u.endpoint] = { calls: 0, cost: 0 }
          }
          endpointBreakdown[u.endpoint].calls += 1
          endpointBreakdown[u.endpoint].cost += u.cost_estimate || 0
        }
      }
    } catch (e) {
      console.warn('api_usage table may not exist:', e)
    }

    // Recent works
    const { data: recentWorks } = await supabase
      .from('works')
      .select('id, title, genre, work_type, created_at, user_id')
      .order('created_at', { ascending: false })
      .limit(20)

    return NextResponse.json({
      overview: {
        totalUsers: totalUsers || 0,
        totalWorks: totalWorks || 0,
        totalChapters: totalChapters || 0,
        todayWords: todayTotal,
        activeToday,
      },
      dailyTrend: Object.values(dailyTrend),
      cost: {
        totalWeekly: Math.round(totalCost * 100) / 100,
        byEndpoint: endpointBreakdown,
      },
      recentWorks: recentWorks || [],
    })
  } catch (error) {
    console.error('Admin error:', error)
    return NextResponse.json({ error: '관리자 데이터 조회 중 오류 발생' }, { status: 500 })
  }
}
