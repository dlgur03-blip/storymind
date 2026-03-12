// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { callGemini, parseJSON } from '@/lib/gemini'
import { useCredits } from '@/lib/credits'

const STEP_CONFIGS = [
  {
    step: 1,
    field: 'analysis',
    system: `당신은 웹소설 기획 전문가입니다. 아이디어를 분석하여 장르/테마/갈등/로그라인/타겟독자/차별점을 추출하세요.
반드시 JSON만 반환하세요:
{
  "genre": "장르",
  "theme": "핵심 주제/테마",
  "conflict": "핵심 갈등 구조",
  "logline": "한 줄 요약 (로그라인)",
  "target_audience": "타겟 독자층",
  "unique_selling_point": "차별화 포인트",
  "feedback": "AI의 분석 코멘트 (2-3문장)"
}`,
    buildContent: (plan: any) => {
      return `[작품 정보]\n제목: ${plan.title}\n장르: ${plan.genre}\n아이디어: ${plan.idea_text}`
    },
    extractData: (parsed: any) => parsed,
  },
  {
    step: 2,
    field: 'arcs',
    system: `당신은 스토리 구조 전문가입니다. 분석 결과를 기반으로 최적의 스토리 아크 1개를 설계하세요.
반드시 JSON만 반환하세요:
{
  "name": "아크 이름",
  "description": "아크 설명 (3-4문장)",
  "structure": "기승전결 구조 요약",
  "tone": "전체적인 톤/분위기",
  "ending_type": "결말 유형 (해피엔딩/비극/열린결말 등)",
  "feedback": "AI의 제안 코멘트"
}`,
    buildContent: (plan: any, results: any) => {
      return `[작품 정보]\n제목: ${plan.title}\n장르: ${plan.genre}\n아이디어: ${plan.idea_text}\n\n[Step 1 분석 결과]\n${JSON.stringify(results.analysis, null, 2)}`
    },
    extractData: (parsed: any) => parsed,
  },
  {
    step: 3,
    field: 'characters',
    system: `당신은 캐릭터 설계 전문가입니다. 아크에 맞는 주요 캐릭터 4-6명을 생성하세요.
주인공, 히로인/서브 주인공, 안타고니스트, 조력자 등을 포함하세요.
반드시 JSON만 반환하세요:
{
  "characters": [
    {
      "name": "이름",
      "role": "역할 (주인공/히로인/안타고니스트/조력자 등)",
      "appearance": "외모 설명",
      "personality": "성격 (3가지 키워드)",
      "motivation": "동기/목표",
      "backstory": "배경 이야기 (2-3문장)",
      "speech_pattern": "말투 특징",
      "arc": "캐릭터 성장 아크"
    }
  ],
  "relationships": "주요 캐릭터 관계도 설명",
  "feedback": "AI의 캐릭터 설계 코멘트"
}`,
    buildContent: (plan: any, results: any) => {
      return `[작품 정보]\n제목: ${plan.title}\n장르: ${plan.genre}\n아이디어: ${plan.idea_text}\n\n[Step 1 분석 결과]\n${JSON.stringify(results.analysis, null, 2)}\n\n[Step 2 스토리 아크]\n${JSON.stringify(results.arcs, null, 2)}`
    },
    extractData: (parsed: any) => parsed.characters || [],
  },
  {
    step: 4,
    field: 'world',
    system: `당신은 세계관 설계 전문가입니다. 스토리 아크와 캐릭터에 맞는 세계관/배경을 구축하세요.
반드시 JSON만 반환하세요:
{
  "world": [
    {
      "category": "카테고리 (지리/사회/마법체계/기술/문화/역사/경제 등)",
      "name": "설정 이름",
      "description": "상세 설명 (2-3문장)"
    }
  ],
  "setting_summary": "세계관 한 줄 요약",
  "time_period": "시대적 배경",
  "key_locations": ["주요 장소1", "주요 장소2", "주요 장소3"],
  "feedback": "AI의 세계관 설계 코멘트"
}`,
    buildContent: (plan: any, results: any) => {
      return `[작품 정보]\n제목: ${plan.title}\n장르: ${plan.genre}\n아이디어: ${plan.idea_text}\n\n[Step 1 분석 결과]\n${JSON.stringify(results.analysis, null, 2)}\n\n[Step 2 스토리 아크]\n${JSON.stringify(results.arcs, null, 2)}\n\n[Step 3 캐릭터]\n${JSON.stringify(results.characters, null, 2)}`
    },
    extractData: (parsed: any) => parsed.world || [],
  },
  {
    step: 5,
    field: 'conti',
    system: `당신은 웹소설 연재 기획 전문가입니다. 스토리 아크, 캐릭터, 세계관을 바탕으로 10화 분량의 에피소드 콘티를 작성하세요.
각 에피소드는 웹소설 1화 분량(3000-5000자)에 해당합니다.
반드시 JSON만 반환하세요:
{
  "conti": [
    {
      "episode": 1,
      "title": "에피소드 제목",
      "summary": "줄거리 요약 (3-5문장)",
      "key_events": ["핵심 이벤트1", "핵심 이벤트2"],
      "characters_involved": ["등장 캐릭터1", "등장 캐릭터2"],
      "tension": 7,
      "cliffhanger": "클리프행어/떡밥 설명",
      "notes": "작가 참고사항"
    }
  ],
  "overall_pacing": "전체 페이싱 설명",
  "feedback": "AI의 콘티 설계 코멘트"
}`,
    buildContent: (plan: any, results: any) => {
      return `[작품 정보]\n제목: ${plan.title}\n장르: ${plan.genre}\n아이디어: ${plan.idea_text}\n\n[Step 1 분석 결과]\n${JSON.stringify(results.analysis, null, 2)}\n\n[Step 2 스토리 아크]\n${JSON.stringify(results.arcs, null, 2)}\n\n[Step 3 캐릭터]\n${JSON.stringify(results.characters, null, 2)}\n\n[Step 4 세계관]\n${JSON.stringify(results.world, null, 2)}`
    },
    extractData: (parsed: any) => parsed.conti || [],
  },
  {
    step: 6,
    field: 'foreshadows',
    system: `당신은 복선 설계 전문가입니다. 콘티를 바탕으로 복선(foreshadowing) 계획을 세우세요.
각 복선은 설치 시점과 회수 시점이 명확해야 합니다.
반드시 JSON만 반환하세요:
{
  "foreshadows": [
    {
      "summary": "복선 내용 요약",
      "planted_episode": 1,
      "resolved_episode": 8,
      "type": "유형 (캐릭터/사건/세계관/아이템 등)",
      "importance": "중요도 (핵심/보조/장식)",
      "hint_method": "암시 방법 설명"
    }
  ],
  "foreshadow_density": "복선 밀도 평가",
  "feedback": "AI의 복선 설계 코멘트"
}`,
    buildContent: (plan: any, results: any) => {
      return `[작품 정보]\n제목: ${plan.title}\n장르: ${plan.genre}\n아이디어: ${plan.idea_text}\n\n[Step 1 분석 결과]\n${JSON.stringify(results.analysis, null, 2)}\n\n[Step 2 스토리 아크]\n${JSON.stringify(results.arcs, null, 2)}\n\n[Step 3 캐릭터]\n${JSON.stringify(results.characters, null, 2)}\n\n[Step 4 세계관]\n${JSON.stringify(results.world, null, 2)}\n\n[Step 5 콘티]\n${JSON.stringify(results.conti, null, 2)}`
    },
    extractData: (parsed: any) => parsed.foreshadows || [],
  },
]

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { user, supabase, error } = await getAuthUser()
    if (!user) return error

    const creditResult = await useCredits(supabase, user.id, 'planner/auto-generate', '자동 스토리 생성')
    if (!creditResult.success) {
      return NextResponse.json({ error: creditResult.error, remainingCredits: creditResult.remaining }, { status: 402 })
    }

    const { id } = await context.params

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

    // Accumulate results across steps
    const results: Record<string, any> = {}
    const conversation: any[] = Array.isArray(plan.conversation) ? [...plan.conversation] : []
    let lastCompletedStep = 0
    let stepError: string | null = null

    for (const config of STEP_CONFIGS) {
      try {
        // Build user content with cumulative context
        const userContent = config.buildContent(plan, results)

        // Call Gemini AI
        const aiResponse = await callGemini(config.system, userContent, {
          temperature: 0.8,
          maxOutputTokens: 4096,
        })

        // Parse the response
        const fullParsed = parseJSON(aiResponse)
        const data = config.extractData(fullParsed)

        // Store result for cumulative context
        results[config.field] = data

        // Extract feedback
        const feedback = fullParsed.feedback || ''

        // Add to conversation
        conversation.push(
          {
            role: 'user',
            content: `[자동 생성] Step ${config.step} 실행`,
            step: config.step,
            timestamp: new Date().toISOString(),
          },
          {
            role: 'assistant',
            content: feedback || aiResponse.substring(0, 500),
            step: config.step,
            timestamp: new Date().toISOString(),
          }
        )

        // Save progress to database after each step
        const updateData: any = {
          [config.field]: data,
          current_step: config.step,
          status: `step${config.step}`,
          conversation,
        }

        const { error: updateError } = await supabase
          .from('story_plans')
          .update(updateData)
          .eq('id', id)

        if (updateError) {
          console.error(`Step ${config.step} save error:`, updateError)
        }

        lastCompletedStep = config.step
      } catch (err: any) {
        console.error(`Auto-generate step ${config.step} failed:`, err)
        stepError = `Step ${config.step} 실패: ${err.message || '알 수 없는 오류'}`
        break
      }
    }

    // If all steps completed, finalize
    if (lastCompletedStep === 6) {
      const { error: finalError } = await supabase
        .from('story_plans')
        .update({
          status: 'complete',
          current_step: 6,
          selected_arc: 'auto',
          conversation,
        })
        .eq('id', id)

      if (finalError) {
        console.error('Final update error:', finalError)
      }
    }

    // Fetch updated plan
    const { data: updatedPlan } = await supabase
      .from('story_plans')
      .select('*')
      .eq('id', id)
      .single()

    // Return result
    if (stepError) {
      return NextResponse.json({
        success: false,
        error: stepError,
        completedSteps: lastCompletedStep,
        plan: updatedPlan,
      }, { status: 207 })
    }

    return NextResponse.json({
      success: true,
      plan: updatedPlan,
    })
  } catch (error: any) {
    console.error('Auto-generate error:', error)
    return NextResponse.json(
      { error: '자동 생성 중 오류 발생: ' + (error.message || '알 수 없는 오류') },
      { status: 500 }
    )
  }
}
