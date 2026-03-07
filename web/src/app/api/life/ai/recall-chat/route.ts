// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { callGemini } from '@/lib/gemini'

function getAgeGuide(age: number): string {
  if (age <= 2) return '이 시기는 본인이 기억하기 어려운 나이야. 부모님이나 가족에게 들은 이야기, 사진 속 모습, 가족들이 자주 하던 말 등을 물어봐.'
  if (age <= 6) return '유치원, 집 근처, 좋아하던 장난감, 친구, 좋아하던 음식, 무서웠던 것, 가족과의 추억을 물어봐.'
  if (age <= 12) return '학교생활, 친구, 선생님, 좋아하던 놀이, 방과 후 활동, 가족 여행, 처음 경험한 것들을 물어봐.'
  if (age <= 18) return '사춘기, 꿈, 첫사랑, 학교 행사, 진로 고민, 친구 관계, 취미, 음악, 처음 해본 경험들을 물어봐.'
  return '독립, 대학/사회생활, 연애, 직장, 중요한 결정, 인생의 전환점, 여행, 새로운 도전을 물어봐.'
}

export async function POST(request: NextRequest) {
  try {
    const { user, supabase, error } = await getAuthUser()
    if (!user) return error

    const { message, conversationHistory, recallContext } = await request.json()

    if (!message?.trim()) {
      return NextResponse.json({ error: '메시지를 입력하세요' }, { status: 400 })
    }

    const { age = 0, year, worldSetting, worldDetail, novelStyle, protagonistName, tone, birthPlace, genre } = recallContext || {}

    const ageGuide = getAgeGuide(age)

    let systemPrompt = `너는 사용자의 과거 기억을 끌어내는 친근한 친구야.
현재 ${age}세 시절(${year || '?'}년)에 대해 이야기를 나누고 있어.

규칙:
- 반말을 사용해 (친구처럼)
- 이모지를 자연스럽게 사용해
- 한국어로만 대화해
- 사용자의 기억에 공감하고, 구체적인 디테일을 끌어내 (장소, 냄새, 소리, 감정, 함께한 사람)
- 답변은 2~4문장으로 짧고 자연스럽게
- 3~5번 대화 후 "이 기억으로 챕터를 만들어볼까?" 자연스럽게 제안해

${ageGuide}`

    if (birthPlace) systemPrompt += `\n출생지/성장 지역: ${birthPlace}`
    if (genre) systemPrompt += `\n장르: ${genre}`
    if (tone) systemPrompt += `\n분위기: ${tone}`
    if (worldSetting === 'fantasy') {
      systemPrompt += `\n세계관: 판타지`
      if (worldDetail) systemPrompt += ` (${worldDetail})`
    }

    const history = (conversationHistory || [])
      .map((m: { role: string; content: string }) => `${m.role === 'user' ? '사용자' : 'AI'}: ${m.content}`)
      .join('\n')

    const userContent = history
      ? `이전 대화:\n${history}\n\n사용자: ${message}`
      : `사용자: ${message}`

    const reply = await callGemini(systemPrompt, userContent, {
      temperature: 0.8,
      maxOutputTokens: 500,
    })

    return NextResponse.json({ reply: reply.trim() })
  } catch (error) {
    console.error('Recall chat error:', error)
    return NextResponse.json({ error: 'AI 응답 실패' }, { status: 500 })
  }
}
