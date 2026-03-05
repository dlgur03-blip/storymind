// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'

const GENRE_BENCHMARKS: Record<string, any> = {
  '판타지': { avgChapterLength: 3500, dialogueRatio: 45, avgTension: 6.5, topWorks: ['나 혼자만 레벨업', '전지적 독자 시점', '오버로드'] },
  '로맨스': { avgChapterLength: 3000, dialogueRatio: 55, avgTension: 5.5, topWorks: ['여주인공의 오빠를 꼬셔라', '악녀는 모래시계를 되돌린다'] },
  '로판': { avgChapterLength: 3200, dialogueRatio: 50, avgTension: 5.0, topWorks: ['재혼 황후', '나 혼자 귀환자'] },
  '무협': { avgChapterLength: 4000, dialogueRatio: 35, avgTension: 7.0, topWorks: ['화산귀환', '비검전설'] },
  '현판': { avgChapterLength: 3500, dialogueRatio: 50, avgTension: 6.0, topWorks: ['독보적인 세계관 작품들'] },
  'SF': { avgChapterLength: 3500, dialogueRatio: 40, avgTension: 6.0, topWorks: ['SF 대표작'] },
  '미스터리': { avgChapterLength: 3000, dialogueRatio: 45, avgTension: 7.5, topWorks: ['미스터리 대표작'] },
  '기타': { avgChapterLength: 3000, dialogueRatio: 45, avgTension: 6.0, topWorks: ['다양한 장르'] },
}

export async function POST(request: NextRequest) {
  try {
    const { user, supabase, error } = await getAuthUser()
    if (!user) return error

    const { workId } = await request.json()
    if (!workId) return NextResponse.json({ error: 'workId 필수' }, { status: 400 })

    const { data: work } = await supabase.from('works').select('*').eq('id', workId).single()
    if (!work) return NextResponse.json({ error: '작품을 찾을 수 없습니다' }, { status: 404 })

    const { data: chapters } = await supabase.from('chapters').select('content, word_count').eq('work_id', workId)
    const { data: reviews } = await supabase.from('review_history').select('tension_score').eq('work_id', workId).gt('tension_score', 0)

    const benchmark = GENRE_BENCHMARKS[work.genre] || GENRE_BENCHMARKS['기타']

    // Calculate current metrics
    const chapterLengths = (chapters || []).map(c => {
      const text = (c.content || '').replace(/<[^>]*>/g, '')
      return text.replace(/\s+/g, '').length
    }).filter(l => l > 0)

    const avgChapterLength = chapterLengths.length > 0 ? Math.round(chapterLengths.reduce((a, b) => a + b, 0) / chapterLengths.length) : 0

    // Dialogue ratio
    let totalDialogue = 0
    let totalLines = 0
    ;(chapters || []).forEach(c => {
      const text = (c.content || '').replace(/<[^>]*>/g, '')
      const lines = text.split(/[.!?。]/).filter(l => l.trim().length > 5)
      lines.forEach(l => {
        totalLines++
        if (l.includes('"') || l.includes('\u201C') || l.includes('\u300D')) totalDialogue++
      })
    })
    const dialogueRatio = totalLines > 0 ? Math.round((totalDialogue / totalLines) * 100) : 0

    // Tension
    const tensions = (reviews || []).map(r => r.tension_score)
    const avgTension = tensions.length > 0 ? Math.round((tensions.reduce((a, b) => a + b, 0) / tensions.length) * 10) / 10 : null

    // Score calculation
    const scores: Record<string, number> = {}
    scores.chapterLength = Math.max(0, Math.min(100, 100 - Math.abs(avgChapterLength - benchmark.avgChapterLength) / benchmark.avgChapterLength * 100))
    scores.dialogueRatio = Math.max(0, Math.min(100, 100 - Math.abs(dialogueRatio - benchmark.dialogueRatio) / benchmark.dialogueRatio * 100))
    if (avgTension !== null) {
      scores.tension = Math.max(0, Math.min(100, (avgTension / benchmark.avgTension) * 100))
    }

    const scoreValues = Object.values(scores)
    const overallScore = Math.round(scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length)

    // Recommendations
    const recommendations: Array<{ type: string; message: string }> = []
    if (avgChapterLength < benchmark.avgChapterLength * 0.7) recommendations.push({ type: 'warning', message: `화 길이가 장르 평균보다 짧습니다 (${avgChapterLength}자 vs ${benchmark.avgChapterLength}자)` })
    else if (avgChapterLength > benchmark.avgChapterLength * 1.3) recommendations.push({ type: 'info', message: `화 길이가 장르 평균보다 깁니다` })
    else recommendations.push({ type: 'success', message: '화 길이가 장르에 적합합니다' })

    if (Math.abs(dialogueRatio - benchmark.dialogueRatio) > 15) recommendations.push({ type: 'warning', message: `대화 비율 조정 필요 (${dialogueRatio}% vs ${benchmark.dialogueRatio}%)` })
    else recommendations.push({ type: 'success', message: '대화 비율이 적절합니다' })

    if (avgTension !== null && avgTension < benchmark.avgTension * 0.8) recommendations.push({ type: 'warning', message: `텐션이 장르 평균보다 낮습니다` })

    return NextResponse.json({
      overallScore,
      benchmark: { genre: work.genre, ...benchmark },
      current: { avgChapterLength, dialogueRatio, avgTension },
      scores,
      recommendations,
    })
  } catch (error) {
    console.error('Benchmark error:', error)
    return NextResponse.json({ error: '벤치마크 분석 중 오류 발생' }, { status: 500 })
  }
}
