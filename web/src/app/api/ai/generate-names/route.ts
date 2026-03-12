// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { callGemini, parseJSON } from '@/lib/gemini'
import { useCredits } from '@/lib/credits'

const STYLE_PROMPTS: Record<string, string> = {
  korean: '한국 현대 이름. 흔하지 않으면서 기억에 남는 이름.',
  korean_historical: '한국 사극풍 이름. 고풍스럽고 품격 있는 이름.',
  chinese: '중국풍 이름. 한자 의미가 깊은 이름.',
  japanese: '일본풍 이름. 아름답고 의미 있는 이름.',
  fantasy_western: '서양 판타지 이름. 신비롭고 웅장한 느낌.',
  fantasy_eastern: '동양 판타지 이름. 무협/선협 느낌의 이름.',
  scifi: 'SF/미래적 이름. 독특하고 미래적인 느낌.',
  unique: '독특하고 창의적인 이름. 기존 언어 체계에 얽매이지 않는 이름.',
}

export async function POST(request: NextRequest) {
  try {
    const { user, supabase, error } = await getAuthUser()
    if (!user) return error

    const creditResult = await useCredits(supabase, user.id, 'ai/generate-names', '이름 생성')
    if (!creditResult.success) {
      return NextResponse.json({ error: creditResult.error, remainingCredits: creditResult.remaining }, { status: 402 })
    }

    const { style = 'korean', gender = 'any', count = 5, personality = '' } = await request.json()

    const stylePrompt = STYLE_PROMPTS[style] || STYLE_PROMPTS.korean
    const genderPrompt = gender === 'male' ? '남성 이름만.' : gender === 'female' ? '여성 이름만.' : '성별 무관.'

    const system = `캐릭터 이름 생성 전문가. ${stylePrompt} ${genderPrompt}
${personality ? `캐릭터 성격: ${personality}. 성격에 어울리는 이름을 생성하세요.` : ''}
JSON만: {"names":[{"name":"이름","meaning":"이름의 의미/뉘앙스","vibe":"이 이름이 주는 인상"}]}`

    const result = await callGemini(system, `${count}개의 ${style} 스타일 캐릭터 이름을 생성해주세요.`, { temperature: 0.9, maxOutputTokens: 1024 })
    const parsed = parseJSON(result)

    return NextResponse.json({ names: parsed.names || [] })
  } catch (error) {
    console.error('Name generation error:', error)
    return NextResponse.json({ error: '이름 생성 중 오류 발생' }, { status: 500 })
  }
}
