// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { callGemini, parseJSON } from '@/lib/gemini'
import { useCredits } from '@/lib/credits'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { user, supabase, error } = await getAuthUser()
    if (!user) return error

    const creditResult = await useCredits(supabase, user.id, 'planner/analyze-manuscript', '원고 분석')
    if (!creditResult.success) {
      return NextResponse.json({ error: creditResult.error, remainingCredits: creditResult.remaining }, { status: 402 })
    }

    const { id } = await context.params
    const { workId } = await request.json()

    if (!workId) {
      return NextResponse.json({ error: 'workId가 필요합니다' }, { status: 400 })
    }

    // Verify plan exists and belongs to user
    const { data: plan } = await supabase
      .from('story_plans')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!plan) {
      return NextResponse.json({ error: '플랜을 찾을 수 없습니다' }, { status: 404 })
    }

    // Fetch the work info
    const { data: work } = await supabase
      .from('works')
      .select('title, genre')
      .eq('id', workId)
      .eq('user_id', user.id)
      .single()

    if (!work) {
      return NextResponse.json({ error: '작품을 찾을 수 없습니다' }, { status: 404 })
    }

    // Fetch all chapters ordered by number
    const { data: chapters, error: chaptersError } = await supabase
      .from('chapters')
      .select('number, title, content')
      .eq('work_id', workId)
      .order('number', { ascending: true })

    if (chaptersError) {
      return NextResponse.json({ error: chaptersError.message }, { status: 400 })
    }

    if (!chapters || chapters.length === 0) {
      return NextResponse.json({ error: '분석할 챕터가 없습니다' }, { status: 400 })
    }

    // Strip HTML and concatenate chapter texts
    const chapterTexts = chapters.map((ch) => {
      const plainText = (ch.content || '').replace(/<[^>]*>/g, '')
      return `[${ch.number}화: ${ch.title || '무제'}]\n${plainText}`
    })

    let fullText = chapterTexts.join('\n\n')
    if (fullText.length > 30000) {
      fullText = fullText.slice(0, 30000) + '\n\n...(이하 생략)'
    }

    const workInfo = `작품 제목: ${work.title || '무제'}\n장르: ${work.genre || '미정'}\n총 ${chapters.length}화`

    // Call 1 - Analysis + Arc
    const analysisSystemPrompt = `웹소설 분석 전문가. 기존 원고를 읽고 작품의 장르, 테마, 핵심 갈등, 로그라인, 스토리 아크를 분석하세요. JSON만:
{
  "analysis": {
    "genre": "장르",
    "theme": "테마",
    "conflict": "핵심 갈등",
    "logline": "로그라인 (1-2문장)",
    "target_audience": "타겟 독자층",
    "unique_selling_point": "차별점"
  },
  "arc": {
    "name": "아크 이름",
    "description": "아크 설명",
    "structure": "구조 설명",
    "tone": "톤/분위기",
    "ending_type": "결말 유형"
  },
  "feedback": "분석 코멘트"
}`

    const analysisResult = await callGemini(analysisSystemPrompt, `${workInfo}\n\n${fullText}`, {
      temperature: 0.3,
      maxOutputTokens: 4096,
    })
    const analysisData = parseJSON(analysisResult)

    // Call 2 - Characters
    const charactersSystemPrompt = `캐릭터 분석 전문가. 원고에서 등장인물을 추출하고 분석하세요. JSON만:
{
  "characters": [
    {
      "name": "이름",
      "role": "역할 (주인공/조연/적대자 등)",
      "appearance": "외모 묘사",
      "personality": "성격",
      "motivation": "동기/목표",
      "speech_pattern": "말투/언어 습관",
      "arc": "캐릭터 아크/성장",
      "first_chapter": 1
    }
  ],
  "relationships": "주요 인물 관계 설명",
  "feedback": "캐릭터 분석 코멘트"
}`

    const charactersResult = await callGemini(charactersSystemPrompt, `${workInfo}\n\n${fullText}`, {
      temperature: 0.3,
      maxOutputTokens: 4096,
    })
    const charactersData = parseJSON(charactersResult)

    // Call 3 - World + Conti
    const worldContiSystemPrompt = `세계관/콘티 분석 전문가. 원고에서 세계관 설정을 추출하고, 각 화의 콘티를 역으로 작성하세요. JSON만:
{
  "world": [
    {
      "category": "카테고리 (geography/culture/magic/technology/organization/other)",
      "name": "설정 이름",
      "description": "설명"
    }
  ],
  "conti": [
    {
      "episode": 1,
      "title": "에피소드 제목",
      "summary": "줄거리 요약 (3-5문장)",
      "key_events": ["핵심 이벤트1", "핵심 이벤트2"],
      "tension": 7,
      "cliffhanger": "클리프행어/떡밥"
    }
  ],
  "feedback": "세계관/콘티 분석 코멘트"
}`

    const worldContiResult = await callGemini(worldContiSystemPrompt, `${workInfo}\n\n${fullText}`, {
      temperature: 0.3,
      maxOutputTokens: 4096,
    })
    const worldContiData = parseJSON(worldContiResult)

    // Call 4 - Foreshadows
    const foreshadowsSystemPrompt = `복선 분석 전문가. 원고에서 설치된 복선과 미회수 떡밥을 찾아내세요. JSON만:
{
  "foreshadows": [
    {
      "summary": "복선 요약",
      "planted_episode": 1,
      "resolved_episode": null,
      "type": "유형 (character/plot/world/mystery)",
      "importance": "중요도 (high/medium/low)",
      "status": "상태 (resolved/open/partial)"
    }
  ],
  "feedback": "복선 분석 코멘트"
}`

    const foreshadowsResult = await callGemini(foreshadowsSystemPrompt, `${workInfo}\n\n${fullText}`, {
      temperature: 0.3,
      maxOutputTokens: 4096,
    })
    const foreshadowsData = parseJSON(foreshadowsResult)

    // Compile extracted data
    const analysis = analysisData.analysis || {}
    const arc = analysisData.arc || {}
    const characters = Array.isArray(charactersData.characters) ? charactersData.characters : []
    const world = Array.isArray(worldContiData.world) ? worldContiData.world : []
    const conti = Array.isArray(worldContiData.conti) ? worldContiData.conti : []
    const foreshadows = Array.isArray(foreshadowsData.foreshadows) ? foreshadowsData.foreshadows : []

    // Build idea summary from the manuscript
    const ideaSummary = `[기존 원고 분석] ${work.title || '무제'} (${chapters.length}화)\n` +
      `장르: ${analysis.genre || work.genre || '미정'}\n` +
      `로그라인: ${analysis.logline || ''}\n` +
      `테마: ${analysis.theme || ''}\n` +
      `핵심 갈등: ${analysis.conflict || ''}`

    // Update the plan with all extracted data
    const updateData = {
      status: 'complete',
      current_step: 6,
      work_id: workId,
      idea_text: ideaSummary,
      title: plan.title || work.title || '무제',
      genre: analysis.genre || work.genre || '',
      analysis,
      arcs: [arc],
      selected_arc: arc.name || '',
      characters,
      world,
      conti,
      foreshadows,
    }

    const { data: updatedPlan, error: updateError } = await supabase
      .from('story_plans')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      plan: updatedPlan,
      stats: {
        chaptersAnalyzed: chapters.length,
        charactersFound: characters.length,
        worldItemsFound: world.length,
        foreshadowsFound: foreshadows.length,
      },
    })
  } catch (error) {
    console.error('Analyze manuscript error:', error)
    return NextResponse.json({ error: '원고 분석 중 오류 발생' }, { status: 500 })
  }
}
