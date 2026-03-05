// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { callGemini, parseJSON } from '@/lib/gemini'

export async function POST(request: NextRequest) {
  try {
    const { user, supabase, error } = await getAuthUser()
    if (!user) return error

    const { chapterId } = await request.json()
    if (!chapterId) return NextResponse.json({ error: 'chapterId 필수' }, { status: 400 })

    const { data: chapter } = await supabase
      .from('chapters')
      .select('content, number, title')
      .eq('id', chapterId)
      .single()
    if (!chapter) return NextResponse.json({ error: '화를 찾을 수 없습니다' }, { status: 404 })

    const text = (chapter.content || '').replace(/<[^>]*>/g, '').substring(0, 10000)

    const result = await callGemini(
      '웹소설 요약 전문가. 핵심만 간결하게. JSON만: {"summary":"1-2문장 요약","keyPoints":["핵심1","핵심2","핵심3"]}',
      text,
      { temperature: 0.3, maxOutputTokens: 512 }
    )
    const parsed = parseJSON(result)

    // Save summary to chapter
    if (parsed.summary) {
      await supabase.from('chapters').update({ summary: parsed }).eq('id', chapterId)
    }

    return NextResponse.json(parsed)
  } catch (error) {
    console.error('Summarize chapter error:', error)
    return NextResponse.json({ error: '요약 중 오류 발생' }, { status: 500 })
  }
}
