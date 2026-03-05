// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { callGemini, parseJSON } from '@/lib/gemini'

export async function POST(request: NextRequest) {
  try {
    const { user, supabase, error } = await getAuthUser()
    if (!user) return error

    const { workId } = await request.json()
    if (!workId) return NextResponse.json({ error: 'workId 필수' }, { status: 400 })

    const { data: work } = await supabase.from('works').select('title, genre').eq('id', workId).single()
    const { data: chapters } = await supabase
      .from('chapters')
      .select('number, title, summary')
      .eq('work_id', workId)
      .order('number')

    const summaries = (chapters || []).map(c => {
      const sum = c.summary as { summary?: string } | null
      return `${c.number}화 "${c.title || ''}": ${sum?.summary || '요약 없음'}`
    }).join('\n')

    const system = `웹소설 전체 요약 전문가. 전체 스토리 흐름을 파악하여 종합 요약을 작성하세요.
JSON만: {"overview":"작품 전체 요약 (3-5문장)","mainPlot":"주요 줄거리","themes":["테마1","테마2"],"characterArcs":[{"name":"캐릭터명","arc":"성장/변화 요약"}],"unresolved":["미해결 떡밥/복선"]}`

    const result = await callGemini(system, `작품: ${work?.title} (${work?.genre})\n${summaries}`, { maxOutputTokens: 2048 })
    const parsed = parseJSON(result)

    return NextResponse.json(parsed)
  } catch (error) {
    console.error('Summarize work error:', error)
    return NextResponse.json({ error: '전체 요약 중 오류 발생' }, { status: 500 })
  }
}
