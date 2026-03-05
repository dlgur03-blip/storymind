// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { user, supabase, error } = await getAuthUser()
    if (!user) return error

    const { workId, issueType, description, action } = await request.json()
    if (!workId || !issueType || !action) {
      return NextResponse.json({ error: 'workId, issueType, action 필수' }, { status: 400 })
    }

    await supabase.from('review_feedback').insert({
      work_id: workId,
      issue_type: issueType,
      issue_description: description || '',
      action,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Feedback error:', error)
    return NextResponse.json({ error: '피드백 저장 중 오류 발생' }, { status: 500 })
  }
}
