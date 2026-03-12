// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { callGemini, parseJSON } from '@/lib/gemini'
import { useCredits } from '@/lib/credits'

export async function POST(request: NextRequest) {
  try {
    const { user, supabase, error } = await getAuthUser()
    if (!user) return error

    const creditResult = await useCredits(supabase, user.id, 'ai/learn-style', '스타일 분석')
    if (!creditResult.success) {
      return NextResponse.json({ error: creditResult.error, remainingCredits: creditResult.remaining }, { status: 402 })
    }

    const { workId, sampleText } = await request.json()
    if (!workId) {
      return NextResponse.json({ error: 'workId 필수' }, { status: 400 })
    }

    let textToAnalyze = sampleText
    if (!textToAnalyze) {
      const { data: chapters } = await supabase
        .from('chapters')
        .select('content')
        .eq('work_id', workId)
        .order('number')
        .limit(10)

      if (!chapters || chapters.length === 0) {
        return NextResponse.json({ error: '분석할 챕터가 없습니다' }, { status: 400 })
      }

      textToAnalyze = chapters
        .map(c => (c.content || '').replace(/<[^>]*>/g, ''))
        .join('\n\n---\n\n')
    }

    const text = textToAnalyze.substring(0, 30000)

    const system = `문체 분석 전문가. 작가의 고유한 문체 특성을 정밀하게 분석하세요.

다음 항목을 분석하여 JSON으로 반환:
{
  "sentence_stats": {
    "avg_length": 평균문장길이(자),
    "min_length": 최단문장길이,
    "max_length": 최장문장길이,
    "variance": "낮음|중간|높음"
  },
  "dialogue_ratio": 0.0~1.0 (대화 비율),
  "paragraph_style": "짧음|중간|길음",
  "common_endings": ["~다","~네","~군" 등 자주 쓰는 어미 10개],
  "unique_expressions": ["작가 특유의 표현/비유 5개"],
  "style_features": ["문체 특징 5개"],
  "rhythm_pattern": "빠름|보통|느림",
  "description_style": "간결|보통|상세",
  "emotion_expression": "직접적|암시적|혼합",
  "narrative_voice": "1인칭|3인칭제한|3인칭전지|혼합",
  "tense_preference": "과거형|현재형|혼합"
}`

    const result = await callGemini(system, text, { temperature: 0.3 })
    const parsed = parseJSON(result)

    if (!parsed.sentence_stats) {
      return NextResponse.json({ error: '문체 분석 실패' }, { status: 500 })
    }

    const { data: existing } = await supabase
      .from('style_profiles')
      .select('id')
      .eq('work_id', workId)
      .single()

    const profileData = {
      work_id: workId,
      sentence_stats: parsed.sentence_stats,
      dialogue_ratio: parsed.dialogue_ratio,
      paragraph_style: parsed.paragraph_style,
      common_endings: parsed.common_endings,
      unique_expressions: parsed.unique_expressions,
      style_features: parsed.style_features,
      rhythm_pattern: parsed.rhythm_pattern,
      description_style: parsed.description_style,
      emotion_expression: parsed.emotion_expression,
      narrative_voice: parsed.narrative_voice,
      sample_sentences: text.split(/[.!?]\s/).slice(0, 20).map(s => s.trim()).filter(s => s.length > 10),
    }

    if (existing) {
      await supabase
        .from('style_profiles')
        .update(profileData)
        .eq('id', existing.id)
    } else {
      await supabase
        .from('style_profiles')
        .insert(profileData)
    }

    return NextResponse.json({
      message: '문체 학습 완료',
      profile: parsed,
    })
  } catch (error) {
    console.error('Learn style error:', error)
    return NextResponse.json({ error: '문체 학습 중 오류 발생' }, { status: 500 })
  }
}
