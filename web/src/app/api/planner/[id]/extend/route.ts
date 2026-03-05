// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { callGemini, parseJSON } from '@/lib/gemini'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { user, supabase, error } = await getAuthUser()
    if (!user) return error

    const { id } = await context.params
    const { count = 10 } = await request.json()

    // Get current plan
    const { data: plan } = await supabase
      .from('story_plans')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!plan) {
      return NextResponse.json({ error: '플랜을 찾을 수 없습니다' }, { status: 404 })
    }

    const existingConti = Array.isArray(plan.conti) ? plan.conti : []
    const lastEpisode = existingConti.length
    const startEpisode = lastEpisode + 1
    const endEpisode = lastEpisode + count

    const systemPrompt = `당신은 웹소설 연재 기획 전문가입니다. 기존 콘티를 이어서 ${count}화 분량의 에피소드 콘티를 추가 작성하세요.
기존 콘티의 흐름, 복선, 캐릭터 아크를 자연스럽게 이어가세요.
에피소드 번호는 ${startEpisode}부터 ${endEpisode}까지입니다.
반드시 JSON만 반환하세요:
{
  "conti": [
    {
      "episode": ${startEpisode},
      "title": "에피소드 제목",
      "summary": "줄거리 요약 (3-5문장)",
      "key_events": ["핵심 이벤트1", "핵심 이벤트2"],
      "characters_involved": ["등장 캐릭터1", "등장 캐릭터2"],
      "tension": 7,
      "cliffhanger": "클리프행어/떡밥 설명",
      "notes": "작가 참고사항"
    }
  ],
  "feedback": "추가 콘티 설계 코멘트"
}`

    const contextText = `[작품 정보]
제목: ${plan.title}
장르: ${plan.genre}

[분석]
${JSON.stringify(plan.analysis, null, 2)}

[선택된 아크]
${plan.selected_arc}
${JSON.stringify(plan.arcs, null, 2)}

[캐릭터]
${JSON.stringify(plan.characters, null, 2)}

[세계관]
${JSON.stringify(plan.world, null, 2)}

[기존 콘티 (${existingConti.length}화)]
${JSON.stringify(existingConti, null, 2)}

[복선]
${JSON.stringify(plan.foreshadows, null, 2)}

${startEpisode}화부터 ${endEpisode}화까지 ${count}화 분량을 추가해주세요.`

    const aiResponse = await callGemini(systemPrompt, contextText, {
      temperature: 0.8,
      maxOutputTokens: 4096,
    })

    const parsed = parseJSON(aiResponse)
    const newConti = parsed.conti || []

    if (!Array.isArray(newConti) || newConti.length === 0) {
      return NextResponse.json({ error: 'AI가 콘티를 생성하지 못했습니다' }, { status: 500 })
    }

    // Merge with existing conti
    const mergedConti = [...existingConti, ...newConti]

    const { error: updateError } = await supabase
      .from('story_plans')
      .update({ conti: mergedConti })
      .eq('id', id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      newConti,
      totalEpisodes: mergedConti.length,
      feedback: parsed.feedback || '',
    })
  } catch (error) {
    console.error('Extend conti error:', error)
    return NextResponse.json({ error: '콘티 확장 중 오류 발생' }, { status: 500 })
  }
}
