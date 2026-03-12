// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { callGemini, parseJSON } from '@/lib/gemini'
import { useCredits } from '@/lib/credits'

const STEP_PROMPTS = {
  1: {
    system: `당신은 스토리 기획 전문가입니다. 사용자의 아이디어를 분석하여 장르, 주제(테마), 핵심 갈등을 추출하세요.
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
    field: 'analysis',
    nextStep: 2,
  },
  2: {
    system: `당신은 스토리 구조 전문가입니다. 분석 결과를 바탕으로 3가지 서로 다른 스토리 아크를 제안하세요.
각 아크는 서로 다른 방향성을 가져야 합니다.
반드시 JSON만 반환하세요:
{
  "arc1": {
    "name": "아크 이름",
    "description": "아크 설명 (3-4문장)",
    "structure": "기승전결 구조 요약",
    "tone": "전체적인 톤/분위기",
    "ending_type": "결말 유형 (해피엔딩/비극/열린결말 등)"
  },
  "arc2": { "name": "", "description": "", "structure": "", "tone": "", "ending_type": "" },
  "arc3": { "name": "", "description": "", "structure": "", "tone": "", "ending_type": "" },
  "feedback": "AI의 제안 코멘트"
}`,
    field: 'arcs',
    nextStep: 3,
  },
  3: {
    system: `당신은 캐릭터 설계 전문가입니다. 선택된 스토리 아크에 맞는 주요 캐릭터들을 생성하세요.
주인공, 히로인/서브 주인공, 안타고니스트, 조력자 등 4-6명의 캐릭터를 만드세요.
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
    field: 'characters',
    nextStep: 4,
  },
  4: {
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
    field: 'world',
    nextStep: 5,
  },
  5: {
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
    field: 'conti',
    nextStep: 6,
  },
  6: {
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
    field: 'foreshadows',
    nextStep: 6,
  },
}

function buildContext(plan: any, step: number, message: string) {
  let context = `[작품 정보]\n제목: ${plan.title}\n장르: ${plan.genre}\n아이디어: ${plan.idea_text}\n`

  if (step >= 2 && plan.analysis && Object.keys(plan.analysis).length > 0) {
    context += `\n[Step 1 분석 결과]\n${JSON.stringify(plan.analysis, null, 2)}\n`
  }
  if (step >= 3 && plan.arcs && Object.keys(plan.arcs).length > 0) {
    context += `\n[Step 2 스토리 아크]\n${JSON.stringify(plan.arcs, null, 2)}\n`
    if (plan.selected_arc) {
      context += `선택된 아크: ${plan.selected_arc}\n`
    }
  }
  if (step >= 4 && plan.characters && Array.isArray(plan.characters) && plan.characters.length > 0) {
    context += `\n[Step 3 캐릭터]\n${JSON.stringify(plan.characters, null, 2)}\n`
  }
  if (step >= 5 && plan.world && Array.isArray(plan.world) && plan.world.length > 0) {
    context += `\n[Step 4 세계관]\n${JSON.stringify(plan.world, null, 2)}\n`
  }
  if (step >= 6 && plan.conti && Array.isArray(plan.conti) && plan.conti.length > 0) {
    context += `\n[Step 5 콘티]\n${JSON.stringify(plan.conti, null, 2)}\n`
  }

  context += `\n[사용자 메시지]\n${message}`
  return context
}

function parseArrayJSON(text: string): any[] {
  if (!text) return []
  try {
    // Try parsing the full response as JSON object first
    const obj = parseJSON(text)
    // Check common fields that contain arrays
    for (const key of ['characters', 'conti', 'world', 'foreshadows']) {
      if (Array.isArray(obj[key])) return obj[key]
    }
    // Try parsing as array directly
    const match = text.match(/\[[\s\S]*\]/)
    if (match) return JSON.parse(match[0])
    return []
  } catch {
    return []
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { user, supabase, error } = await getAuthUser()
    if (!user) return error

    const creditResult = await useCredits(supabase, user.id, 'planner/chat', '플래너 채팅')
    if (!creditResult.success) {
      return NextResponse.json({ error: creditResult.error, remainingCredits: creditResult.remaining }, { status: 402 })
    }

    const { id } = await context.params
    const { message, step } = await request.json()

    if (!message || !step) {
      return NextResponse.json({ error: 'message와 step은 필수입니다' }, { status: 400 })
    }

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

    const stepConfig = STEP_PROMPTS[step]
    if (!stepConfig) {
      return NextResponse.json({ error: '잘못된 step입니다' }, { status: 400 })
    }

    // Build context and call AI
    const aiContext = buildContext(plan, step, message)
    const aiResponse = await callGemini(stepConfig.system, aiContext, {
      temperature: 0.8,
      maxOutputTokens: 4096,
    })

    // Parse the response based on step
    let parsedData: any
    const fullParsed = parseJSON(aiResponse)

    if (step === 1 || step === 2) {
      // analysis and arcs are objects
      parsedData = fullParsed
    } else if (step === 3) {
      // characters is an array
      parsedData = fullParsed.characters || parseArrayJSON(aiResponse)
    } else if (step === 4) {
      // world is an array
      parsedData = fullParsed.world || parseArrayJSON(aiResponse)
    } else if (step === 5) {
      // conti is an array
      parsedData = fullParsed.conti || parseArrayJSON(aiResponse)
    } else if (step === 6) {
      // foreshadows is an array
      parsedData = fullParsed.foreshadows || parseArrayJSON(aiResponse)
    }

    // Extract feedback from parsed data
    const feedback = fullParsed.feedback || fullParsed.overall_pacing || ''

    // Update conversation history
    const conversation = Array.isArray(plan.conversation) ? [...plan.conversation] : []
    conversation.push(
      { role: 'user', content: message, step, timestamp: new Date().toISOString() },
      { role: 'assistant', content: feedback || aiResponse.substring(0, 500), step, timestamp: new Date().toISOString() }
    )

    // Build update object
    const updateData: any = {
      conversation,
      [stepConfig.field]: parsedData,
      current_step: stepConfig.nextStep,
      status: `step${stepConfig.nextStep}`,
    }

    // For step 2, if user selected an arc in their message, save it
    if (step === 2) {
      const arcMatch = message.match(/아크\s*(\d)|arc\s*(\d)|(\d)번/i)
      if (arcMatch) {
        const arcNum = arcMatch[1] || arcMatch[2] || arcMatch[3]
        updateData.selected_arc = `arc${arcNum}`
      }
    }

    // For step 6, mark as complete
    if (step === 6) {
      updateData.status = 'complete'
    }

    // Save to database
    const { error: updateError } = await supabase
      .from('story_plans')
      .update(updateData)
      .eq('id', id)

    if (updateError) {
      console.error('Plan update error:', updateError)
      return NextResponse.json({ error: '플랜 업데이트 중 오류 발생' }, { status: 500 })
    }

    return NextResponse.json({
      step,
      field: stepConfig.field,
      data: parsedData,
      feedback,
      nextStep: stepConfig.nextStep,
      conversation,
    })
  } catch (error) {
    console.error('Planner chat error:', error)
    return NextResponse.json({ error: 'AI 처리 중 오류 발생' }, { status: 500 })
  }
}
