// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

// Public endpoint - no auth required (for sharing)
export async function GET(request: NextRequest) {
  try {
    const workId = request.nextUrl.searchParams.get('workId')
    const chapterId = request.nextUrl.searchParams.get('chapterId')

    if (!workId || !chapterId) {
      return NextResponse.json({ error: 'workId, chapterId 필수' }, { status: 400 })
    }

    const supabase = await createServerSupabase()

    const { data: work } = await supabase.from('works').select('title, genre').eq('id', workId).single()
    const { data: chapter } = await supabase.from('chapters').select('number, title, word_count').eq('id', chapterId).single()
    const { data: review } = await supabase
      .from('review_history')
      .select('issues, tension_score, created_at')
      .eq('work_id', workId)
      .eq('chapter_id', chapterId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!review) {
      return NextResponse.json({ error: '리뷰를 찾을 수 없습니다' }, { status: 404 })
    }

    return NextResponse.json({
      work: { title: work?.title, genre: work?.genre },
      chapter: { number: chapter?.number, title: chapter?.title, wordCount: chapter?.word_count },
      review: {
        tensionScore: review.tension_score,
        issueCount: (review.issues as any)?.issues?.length || 0,
        issues: (review.issues as any)?.issues || [],
        feedback: (review.issues as any)?.overall_feedback || '',
        createdAt: review.created_at,
      },
    })
  } catch (error) {
    console.error('Report error:', error)
    return NextResponse.json({ error: '리포트 조회 중 오류 발생' }, { status: 500 })
  }
}
