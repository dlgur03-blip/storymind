// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const { user, supabase, error } = await getAuthUser()
    if (!user) return error

    const workId = request.nextUrl.searchParams.get('workId')
    if (!workId) return NextResponse.json({ error: 'workId 필수' }, { status: 400 })

    const { data: feedback } = await supabase
      .from('review_feedback')
      .select('issue_type, action')
      .eq('work_id', workId)

    if (!feedback || feedback.length === 0) {
      return NextResponse.json({ accuracy: null, total: 0, accepted: 0, rejected: 0 })
    }

    const accepted = feedback.filter(f => f.action === 'accept').length
    const rejected = feedback.filter(f => f.action === 'reject').length
    const total = feedback.length
    const accuracy = total > 0 ? Math.round((accepted / total) * 100) : 0

    // By type breakdown
    const byType: Record<string, { accepted: number; rejected: number }> = {}
    feedback.forEach(f => {
      if (!byType[f.issue_type]) byType[f.issue_type] = { accepted: 0, rejected: 0 }
      if (f.action === 'accept') byType[f.issue_type].accepted++
      else byType[f.issue_type].rejected++
    })

    return NextResponse.json({ accuracy, total, accepted, rejected, byType })
  } catch (error) {
    console.error('Accuracy error:', error)
    return NextResponse.json({ error: '정확도 조회 중 오류 발생' }, { status: 500 })
  }
}
