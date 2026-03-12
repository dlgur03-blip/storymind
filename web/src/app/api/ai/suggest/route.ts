// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { callGemini, parseJSON } from '@/lib/gemini'
import { useCredits } from '@/lib/credits'

export async function POST(request: NextRequest) {
  try {
    const { user, supabase, error } = await getAuthUser()
    if (!user) return error

    const creditResult = await useCredits(supabase, user.id, 'ai/suggest', '문장 제안')
    if (!creditResult.success) {
      return NextResponse.json({ error: creditResult.error, remainingCredits: creditResult.remaining }, { status: 402 })
    }

    const { workId, chapterId, idea } = await request.json()
    if (!workId || !chapterId) {
      return NextResponse.json({ error: 'workId, chapterId 필수' }, { status: 400 })
    }

    const { data: chapter } = await supabase
      .from('chapters')
      .select('*')
      .eq('id', chapterId)
      .single()
    if (!chapter) {
      return NextResponse.json({ error: '화를 찾을 수 없습니다' }, { status: 404 })
    }

    const { data: work } = await supabase
      .from('works')
      .select('*')
      .eq('id', workId)
      .single()

    const { data: prevChapters } = await supabase
      .from('chapters')
      .select('number, title, content, summary')
      .eq('work_id', workId)
      .lt('number', chapter.number)
      .order('number', { ascending: false })
      .limit(5)

    const { data: allSummaries } = await supabase
      .from('chapters')
      .select('number, title, summary')
      .eq('work_id', workId)
      .lt('number', chapter.number)
      .not('summary', 'is', null)
      .order('number')

    const [chars, foreshadows, world, timeline] = await Promise.all([
      supabase.from('vault_characters').select('name, appearance, personality, is_alive, speech_pattern').eq('work_id', workId),
      supabase.from('vault_foreshadows').select('summary, status, planted_chapter').eq('work_id', workId),
      supabase.from('vault_world').select('category, name, description').eq('work_id', workId),
      supabase.from('vault_timeline').select('chapter, event_summary, in_world_time, season').eq('work_id', workId).order('chapter'),
    ])

    const vault = {
      characters: chars.data || [],
      foreshadows: foreshadows.data || [],
      world: world.data || [],
      timeline: timeline.data || [],
    }

    const plain = (chapter.content || '').replace(/<[^>]*>/g, '')

    const summaryContext = (allSummaries || []).length > 0
      ? `[이전 화 요약]\n${(allSummaries || []).map((s: { number: number; title: string; summary: { summary?: string } | null }) => {
          const sum = s.summary
          return `${s.number}화 "${s.title}": ${sum?.summary || '요약 없음'}`
        }).join('\n')}`
      : ''

    const recentFullContent = (prevChapters || []).map((c: { number: number; title: string; content: string }) => {
      const text = (c.content || '').replace(/<[^>]*>/g, '')
      return `[${c.number}화 "${c.title || ''}"]\n${text}`
    }).join('\n\n---\n\n')

    const context = `작품:${work?.title}(${work?.work_type},${work?.genre},스타일:${work?.style_preset})
StoryVault:${JSON.stringify(vault)}
${summaryContext}
[최근 5화 전문]
${recentFullContent}
[현재 ${chapter.number}화 진행상황]
${plain}
${idea ? `\n작가 메모/아이디어: ${idea}` : ''}`

    const system = work?.work_type === 'webtoon'
      ? `웹툰 스토리 전개 제안 전문가. StoryVault 설정을 활용하고, 미회수 복선 회수 기회도 제안하세요.
JSON만: {"suggestions":[{"title":"제안 제목","description":"상세 설명","type":"main|subplot|character|twist|foreshadow"}],"foreshadow_opportunities":["회수 가능한 복선1","복선2"]}`
      : `웹소설 전개 제안 전문가. StoryVault 설정을 활용하고, 미회수 복선 회수 기회도 제안하세요.
JSON만: {"suggestions":[{"title":"제안 제목","description":"상세 설명","type":"main|subplot|character|twist|foreshadow"}],"foreshadow_opportunities":["회수 가능한 복선1","복선2"]}`

    const result = await callGemini(system, context, { temperature: 0.8, maxOutputTokens: 3000 })
    const parsed = parseJSON(result)

    return NextResponse.json({
      suggestions: parsed.suggestions || [],
      foreshadow_opportunities: parsed.foreshadow_opportunities || [],
    })
  } catch (error) {
    console.error('Suggest error:', error)
    return NextResponse.json({ error: '전개 제안 중 오류 발생' }, { status: 500 })
  }
}
