// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { callGemini } from '@/lib/gemini'

export async function POST(request: NextRequest) {
  try {
    const { user, supabase, error } = await getAuthUser()
    if (!user) return error

    const { workId, chapterId, idea, targetWords } = await request.json()
    if (!workId || !chapterId) {
      return NextResponse.json({ error: 'workId, chapterId 필수' }, { status: 400 })
    }

    const { data: chapter } = await supabase
      .from('chapters')
      .select('*')
      .eq('id', chapterId)
      .single()
    if (!chapter) {
      return NextResponse.json({ error: '화를 찾을 수 없습니다' }, { status: 404 })
    }

    const { data: work } = await supabase
      .from('works')
      .select('*')
      .eq('id', workId)
      .single()

    const { data: styleProfile } = await supabase
      .from('style_profiles')
      .select('*')
      .eq('work_id', workId)
      .single()

    const { data: prevChapters } = await supabase
      .from('chapters')
      .select('number, title, content, summary')
      .eq('work_id', workId)
      .lt('number', chapter.number)
      .order('number', { ascending: false })
      .limit(5)

    const { data: allSummaries } = await supabase
      .from('chapters')
      .select('number, title, summary')
      .eq('work_id', workId)
      .lt('number', chapter.number)
      .not('summary', 'is', null)
      .order('number')

    const [chars, foreshadows, world, timeline] = await Promise.all([
      supabase.from('vault_characters').select('*').eq('work_id', workId),
      supabase.from('vault_foreshadows').select('*').eq('work_id', workId),
      supabase.from('vault_world').select('*').eq('work_id', workId),
      supabase.from('vault_timeline').select('*').eq('work_id', workId).order('chapter'),
    ])

    const vault = {
      characters: chars.data || [],
      foreshadows: foreshadows.data || [],
      world: world.data || [],
      timeline: timeline.data || [],
    }

    const plain = (chapter.content || '').replace(/<[^>]*>/g, '')

    const summaryContext = (allSummaries || []).length > 0
      ? `[이전 화 요약]\n${(allSummaries || []).map((s: { number: number; title: string; summary: { summary?: string } | null }) => {
          const sum = s.summary
          return `${s.number}화 "${s.title}": ${sum?.summary || '요약 없음'}`
        }).join('\n')}`
      : ''

    const recentFullContent = (prevChapters || []).map((c: { number: number; title: string; content: string }) => {
      const text = (c.content || '').replace(/<[^>]*>/g, '')
      return `[${c.number}화 "${c.title || ''}"]\n${text}`
    }).join('\n\n---\n\n')

    const styleContext = styleProfile
      ? `[학습된 문체]
평균 문장 길이: ${styleProfile.sentence_stats?.avg_length || '미분석'}자
대화 비율: ${styleProfile.dialogue_ratio ? Math.round(styleProfile.dialogue_ratio * 100) : '?'}%
자주 사용하는 어미: ${(styleProfile.common_endings || []).slice(0, 5).join(', ')}
문체 특징: ${(styleProfile.style_features || []).join(', ')}`
      : `[문체 프리셋: ${work?.style_preset}]`

    const target = targetWords || work?.target_word_count || 3000
    const isWebtoon = work?.work_type === 'webtoon'

    const context = `작품:${work?.title}(${work?.work_type},${work?.genre})
${styleContext}
StoryVault:${JSON.stringify(vault)}
${summaryContext}
[최근 5화 전문]
${recentFullContent}
[현재 ${chapter.number}화 기존 내용]
${plain || '(아직 작성된 내용 없음)'}

작가 아이디어/지시: ${idea || '자유롭게 전개'}`

    const system = isWebtoon
      ? `당신은 웹툰 시나리오 전문 작가입니다.
작가의 아이디어를 바탕으로 웹툰 스크립트를 작성하세요.
StoryVault 설정을 정확히 반영하고, 캐릭터 말투/성격을 유지하세요.
미회수 복선이 있다면 자연스럽게 활용하세요.

형식:
# 씬 번호
[컷 번호] 연출 지문
대사: "캐릭터명: 대사"
효과음: 효과음
나레이션: 나레이션

약 ${Math.floor(target / 100)}씬 분량으로 작성하세요.`
      : `당신은 웹소설 대필 전문 작가입니다.
작가의 아이디어를 바탕으로 자연스러운 한 화를 작성하세요.
StoryVault 설정을 정확히 반영하고, 캐릭터 말투/성격을 일관되게 유지하세요.
미회수 복선이 있다면 자연스럽게 활용하거나 언급하세요.
${styleProfile ? '학습된 문체를 정확히 모방하세요.' : `문체 프리셋(${work?.style_preset})에 맞게 작성하세요.`}

목표 글자수: 약 ${target}자
- action: 짧은 문장, 빠른 전개, 역동적 묘사
- literary: 긴 문장, 내면 묘사, 감각적 표현
- romance: 대화 중심, 감정선 강조, 설렘 묘사
- mystery: 긴장감, 떡밥 배치, 반전 구조

본문만 작성하세요. 설명이나 메타 코멘트 없이.`

    const result = await callGemini(system, context, { temperature: 0.9, maxOutputTokens: 8192 })

    let content = result
      .replace(/^(작가님|아래|다음).*?:\s*/gm, '')
      .replace(/^\[.*?\]\s*/gm, '')
      .trim()

    const htmlContent = content
      .split('\n\n')
      .filter(p => p.trim())
      .map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`)
      .join('\n')

    return NextResponse.json({
      content: htmlContent,
      wordCount: content.replace(/\s/g, '').length,
    })
  } catch (error) {
    console.error('Ghostwrite error:', error)
    return NextResponse.json({ error: '대필 중 오류 발생' }, { status: 500 })
  }
}
