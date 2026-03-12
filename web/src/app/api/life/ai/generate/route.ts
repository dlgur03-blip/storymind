// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { callGemini, parseJSON } from '@/lib/gemini'
import { useCredits } from '@/lib/credits'

const SYSTEM_PROMPT = `너는 대화 내용을 바탕으로 감성적인 소설 챕터를 작성하는 작가야.

규칙:
- 1인칭 시점으로 작성해
- 감각적인 묘사를 풍부하게 사용해 (시각, 청각, 후각, 촉각, 미각)
- 대화 속 사건과 감정을 소설적으로 재구성해
- 800~1500자 분량으로 작성해
- 적절한 챕터 제목을 지어줘
- 한국어로 작성해
- 문학적이지만 읽기 쉬운 문체를 사용해

결과를 다음 JSON 형식으로 반환해:
{
  "title": "챕터 제목",
  "content": "소설 챕터 내용"
}`

export async function POST(request: NextRequest) {
  try {
    const { user, supabase, error } = await getAuthUser()
    if (!user) return error

    const creditResult = await useCredits(supabase, user.id, 'life/ai/generate', '소설 생성')
    if (!creditResult.success) {
      return NextResponse.json({ error: creditResult.error, remainingCredits: creditResult.remaining }, { status: 402 })
    }

    const { conversationHistory, genre, storyTitle, chapterNumber, previousChapterSummary } = await request.json()

    if (!conversationHistory?.length) {
      return NextResponse.json({ error: '대화 내용이 없습니다' }, { status: 400 })
    }

    let context = SYSTEM_PROMPT
    if (genre) context += `\n\n장르: ${genre}`
    if (storyTitle) context += `\n스토리 제목: ${storyTitle}`
    if (chapterNumber) context += `\n챕터 번호: ${chapterNumber}`
    if (previousChapterSummary) context += `\n이전 챕터 요약: ${previousChapterSummary}`

    const conversation = conversationHistory
      .map((m: { role: string; content: string }) => `${m.role === 'user' ? '사용자' : 'AI'}: ${m.content}`)
      .join('\n')

    const result = await callGemini(context, `대화 내용:\n${conversation}`, {
      temperature: 0.9,
      maxOutputTokens: 4096,
    })

    const parsed = parseJSON(result)

    if (!parsed.title || !parsed.content) {
      // Fallback: try to use raw text
      return NextResponse.json({
        title: `챕터 ${chapterNumber || 1}`,
        content: result.replace(/```json\n?/g, '').replace(/```/g, '').trim(),
      })
    }

    return NextResponse.json({
      title: parsed.title,
      content: parsed.content,
    })
  } catch (error) {
    console.error('Life AI generate error:', error)
    return NextResponse.json({ error: '챕터 생성 실패' }, { status: 500 })
  }
}
