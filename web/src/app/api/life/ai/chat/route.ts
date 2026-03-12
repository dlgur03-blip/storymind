// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { callGemini } from '@/lib/gemini'
import { useCredits } from '@/lib/credits'

const SYSTEM_PROMPT = `너는 사용자의 일상 이야기를 들어주는 친근한 친구야. 사용자가 자신의 경험이나 감정을 이야기하면, 관심을 보이고 더 자세한 이야기를 끌어내는 질문을 해줘.

규칙:
- 반말을 사용해 (친구처럼)
- 이모지를 자연스럽게 사용해
- 한국어로만 대화해
- 사용자의 감정에 공감하고, 상황의 디테일을 물어봐 (어떤 분위기였는지, 어떤 느낌이었는지, 주변 환경은 어땠는지)
- 3~5번 정도 대화를 나눈 후에는 "이 이야기로 소설 챕터를 만들어볼까?" 라고 자연스럽게 제안해
- 답변은 2~4문장으로 짧고 자연스럽게

중요: 소설을 쓰는 것이 아니라 대화를 나누는 거야. 소설 챕터 생성은 별도의 단계에서 해.`

export async function POST(request: NextRequest) {
  try {
    const { user, supabase, error } = await getAuthUser()
    if (!user) return error

    const creditResult = await useCredits(supabase, user.id, 'life/ai/chat', 'Story Life 채팅')
    if (!creditResult.success) {
      return NextResponse.json({ error: creditResult.error, remainingCredits: creditResult.remaining }, { status: 402 })
    }

    const { message, conversationHistory, storyContext } = await request.json()

    if (!message?.trim()) {
      return NextResponse.json({ error: '메시지를 입력하세요' }, { status: 400 })
    }

    // Build context
    let context = SYSTEM_PROMPT
    if (storyContext?.genre) {
      context += `\n\n이 스토리의 장르: ${storyContext.genre}`
    }
    if (storyContext?.previousChapterSummary) {
      context += `\n\n이전 챕터 요약: ${storyContext.previousChapterSummary}`
    }

    // Build conversation for the AI
    const history = (conversationHistory || [])
      .map((m: { role: string; content: string }) => `${m.role === 'user' ? '사용자' : 'AI'}: ${m.content}`)
      .join('\n')

    const userContent = history
      ? `이전 대화:\n${history}\n\n사용자: ${message}`
      : `사용자: ${message}`

    const reply = await callGemini(context, userContent, {
      temperature: 0.8,
      maxOutputTokens: 500,
    })

    return NextResponse.json({ reply: reply.trim() })
  } catch (error) {
    console.error('Life AI chat error:', error)
    return NextResponse.json({ error: 'AI 응답 실패' }, { status: 500 })
  }
}
