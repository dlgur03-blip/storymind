// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { callGemini, parseJSON } from '@/lib/gemini'
import { useCredits } from '@/lib/credits'

function getAgeTone(age: number): string {
  if (age <= 2) return '부모의 시점에서 따뜻하게, 감각적인 묘사 (아기의 작은 손, 옹알이 소리, 우유 냄새) 위주로 서술해.'
  if (age <= 6) return '유아의 시선으로, 세상이 크고 신비롭게 느껴지는 톤. 단순하지만 깊은 감정으로 서술해.'
  if (age <= 12) return '아이의 호기심 어린 시선, 학교와 친구 중심, 새로운 발견에 대한 설렘으로 서술해.'
  if (age <= 18) return '사춘기의 예민하고 풍부한 감성, 성장통, 첫 경험들의 강렬함으로 서술해.'
  return '성인의 회고적 시선, 담담하면서도 깊은 울림이 있는 톤으로 서술해.'
}

export async function POST(request: NextRequest) {
  try {
    const { user, supabase, error } = await getAuthUser()
    if (!user) return error

    const creditResult = await useCredits(supabase, user.id, 'life/ai/recall-generate', '회상 소설 생성')
    if (!creditResult.success) {
      return NextResponse.json({ error: creditResult.error, remainingCredits: creditResult.remaining }, { status: 402 })
    }

    const { conversationHistory, recallContext, storyTitle, chapterNumber, previousChapterSummary } = await request.json()

    if (!conversationHistory?.length) {
      return NextResponse.json({ error: '대화 내용이 없습니다' }, { status: 400 })
    }

    const { age = 0, year, worldSetting, worldDetail, novelStyle, protagonistName, tone, birthPlace, genre } = recallContext || {}

    const ageTone = getAgeTone(age)
    const pov = novelStyle === 'fiction'
      ? `3인칭 시점으로 작성해. 주인공 이름은 "${protagonistName || '주인공'}"이야.`
      : '1인칭 시점으로 작성해.'

    let systemPrompt = `너는 대화 내용을 바탕으로 감성적인 소설 챕터를 작성하는 작가야.

이 챕터는 ${age}세(${year || '?'}년) 시절의 기억이야.

규칙:
- ${pov}
- ${ageTone}
- 감각적인 묘사를 풍부하게 사용해 (시각, 청각, 후각, 촉각, 미각)
- 대화 속 사건과 감정을 소설적으로 재구성해
- 800~1500자 분량으로 작성해
- 적절한 챕터 제목을 지어줘 (나이 포함)
- 한국어로 작성해
- 문학적이지만 읽기 쉬운 문체를 사용해`

    if (tone) systemPrompt += `\n분위기: ${tone}`
    if (genre) systemPrompt += `\n장르: ${genre}`
    if (birthPlace) systemPrompt += `\n배경 지역: ${birthPlace}`
    if (storyTitle) systemPrompt += `\n스토리 제목: ${storyTitle}`
    if (previousChapterSummary) systemPrompt += `\n이전 챕터 요약: ${previousChapterSummary}`

    if (worldSetting === 'fantasy' && worldDetail) {
      systemPrompt += `\n\n세계관: 판타지 (${worldDetail}). 현실의 지명/학교 등을 판타지 세계관에 맞게 자연스럽게 변환해서 서술해.`
    }

    systemPrompt += `\n\n결과를 다음 JSON 형식으로 반환해:
{
  "title": "챕터 제목",
  "content": "소설 챕터 내용"
}`

    const conversation = conversationHistory
      .map((m: { role: string; content: string }) => `${m.role === 'user' ? '사용자' : 'AI'}: ${m.content}`)
      .join('\n')

    const result = await callGemini(systemPrompt, `대화 내용:\n${conversation}`, {
      temperature: 0.9,
      maxOutputTokens: 4096,
    })

    const parsed = parseJSON(result)

    if (!parsed.title || !parsed.content) {
      return NextResponse.json({
        title: `${age}세의 기억`,
        content: result.replace(/```json\n?/g, '').replace(/```/g, '').trim(),
      })
    }

    return NextResponse.json({
      title: parsed.title,
      content: parsed.content,
    })
  } catch (error) {
    console.error('Recall generate error:', error)
    return NextResponse.json({ error: '챕터 생성 실패' }, { status: 500 })
  }
}
