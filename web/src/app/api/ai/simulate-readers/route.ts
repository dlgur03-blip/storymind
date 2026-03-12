// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { callGemini, parseJSON } from '@/lib/gemini'
import { useCredits } from '@/lib/credits'

const PERSONA_PROMPTS: Record<string, string> = {
  hardcore: '당신은 이 작품의 열혈 팬입니다. 작품에 깊이 몰입하고, 복선과 설정에 매우 예민합니다. 작은 디테일도 놓치지 않습니다.',
  casual: '당신은 가볍게 웹소설을 읽는 캐주얼 독자입니다. 재미와 몰입감을 중시하고, 복잡한 설정보다 감정적 연결을 선호합니다.',
  critic: '당신은 웹소설 비평가입니다. 문학적 완성도, 서사 구조, 캐릭터 깊이를 객관적으로 평가합니다.',
  shipper: '당신은 캐릭터 간 관계와 로맨스에 집중하는 커플러입니다. 감정선과 케미를 가장 중요하게 봅니다.',
  lurker: '당신은 댓글을 잘 안 쓰는 눈팅러입니다. 조용히 읽되, 재미없으면 바로 이탈합니다.',
  binger: '당신은 작품을 정주행하는 독자입니다. 연속된 스토리 흐름과 다음 화를 읽고 싶은 욕구를 중시합니다.',
}

const PERSONA_NAMES: Record<string, string> = {
  hardcore: '열혈 팬',
  casual: '캐주얼 독자',
  critic: '비평가',
  shipper: '커플러',
  lurker: '눈팅러',
  binger: '정주행러',
}

export async function POST(request: NextRequest) {
  try {
    const { user, supabase, error } = await getAuthUser()
    if (!user) return error

    const creditResult = await useCredits(supabase, user.id, 'ai/simulate-readers', '가상 독자 시뮬레이션')
    if (!creditResult.success) {
      return NextResponse.json({ error: creditResult.error, remainingCredits: creditResult.remaining }, { status: 402 })
    }

    const { workId, chapterId, personas = ['hardcore', 'casual', 'critic'] } = await request.json()
    if (!workId || !chapterId) return NextResponse.json({ error: 'workId, chapterId 필수' }, { status: 400 })

    const { data: chapter } = await supabase.from('chapters').select('content, number').eq('id', chapterId).single()
    if (!chapter) return NextResponse.json({ error: '화를 찾을 수 없습니다' }, { status: 404 })

    const { data: work } = await supabase.from('works').select('title, genre, work_type').eq('id', workId).single()
    const text = (chapter.content || '').replace(/<[^>]*>/g, '').substring(0, 8000)

    const results = await Promise.allSettled(
      personas.map(async (pid: string) => {
        const persona = PERSONA_PROMPTS[pid] || PERSONA_PROMPTS.casual
        const system = `${persona}

이 ${work?.genre || '웹소설'} 작품의 ${chapter.number}화를 읽고 반응하세요.
JSON만: {"reaction":"열광|호의|중립|불만|이탈","continue_reading":0~100,"comment":"한줄 댓글","likes":["좋았던 점"],"concerns":["우려 사항"]}`

        const result = await callGemini(system, text, { temperature: 0.8, maxOutputTokens: 1024 })
        const parsed = parseJSON(result)
        return { name: PERSONA_NAMES[pid] || pid, ...parsed }
      })
    )

    const personaResults = results.map((r, i) => {
      if (r.status === 'fulfilled') return r.value
      return { name: PERSONA_NAMES[personas[i]] || personas[i], reaction: '중립', continue_reading: 50, comment: '분석 실패', error: true }
    })

    const retentions = personaResults.map(p => p.continue_reading || 50)
    const avgRetention = Math.round(retentions.reduce((a, b) => a + b, 0) / retentions.length)

    return NextResponse.json({ personas: personaResults, avgRetention })
  } catch (error) {
    console.error('Reader simulation error:', error)
    return NextResponse.json({ error: '독자 시뮬레이션 중 오류 발생' }, { status: 500 })
  }
}
