// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { callGemini, parseJSON } from '@/lib/gemini'
import { useCredits } from '@/lib/credits'

const getReviewModules = (workType: string) => {
  const isWebtoon = workType === 'webtoon'
  const prefix = isWebtoon ? '웹툰 스크립트' : '웹소설'

  return [
    {
      id: 'M1',
      type: 'contradiction',
      name: '설정 모순',
      system: `${prefix} 설정 모순 탐지 전문가. StoryVault에 기록된 설정과 현재 화를 비교하여 모순만 찾으세요. JSON만: {"issues":[{"type":"contradiction","severity":"critical|warning","description":"","location":"원문 10~30자","suggestion":""}]}`,
    },
    {
      id: 'M2',
      type: 'character',
      name: '캐릭터 일관성',
      system: `캐릭터 일관성 검증 전문가. 외모/성격/말투/능력이 프로필과 다른지 검사. JSON만: {"issues":[{"type":"character","severity":"critical|warning","description":"","location":"원문 10~30자","suggestion":""}]}`,
    },
    {
      id: 'M3',
      type: 'timeline',
      name: '시간선 검증',
      system: `시간선 검증 전문가. 시간 경과 오류, 계절 모순, 날짜 불일치를 탐지. JSON만: {"issues":[{"type":"timeline","severity":"warning|info","description":"","location":"원문 10~30자","suggestion":""}]}`,
    },
    {
      id: 'M4',
      type: 'foreshadow',
      name: '복선 추적',
      system: `복선 추적 전문가. 미회수 복선 회수 여부, 새 복선 설치 탐지. JSON만: {"issues":[{"type":"foreshadow","severity":"info|suggestion","description":"","location":""}],"vault_updates":{"new_foreshadows":[{"summary":"","chapter":0}]}}`,
    },
    {
      id: 'M5',
      type: isWebtoon ? 'script' : 'style',
      name: isWebtoon ? '스크립트 검수' : '문체 이탈',
      system: isWebtoon
        ? '웹툰 스크립트 검수 전문가. 대사 길이, 지문 명확성, 씬 전환 검사. JSON만: {"issues":[{"type":"script","severity":"warning|info","description":"","location":"","suggestion":""}]}'
        : '문체 분석 전문가. 스타일 이탈, 시점 일관성 검사. JSON만: {"issues":[{"type":"style","severity":"warning|info","description":"","location":"","suggestion":""}]}',
    },
    {
      id: 'M6',
      type: 'popularity',
      name: '대중성 분석',
      system: `${prefix} 대중성 전문가. 텐션, 클리프행어 품질, 페이싱 분석. JSON만: {"tension_score":0,"issues":[{"type":"popularity","severity":"suggestion","description":"","location":"","suggestion":""}],"popularity_tips":[""],"cliffhanger_score":0,"pacing_warning":""}`,
    },
    {
      id: 'M7',
      type: 'extraction',
      name: '설정 추출',
      system: `${prefix} 설정 추출 전문가. 새로운 캐릭터, 세계관 요소, 시간선 이벤트 추출. JSON만: {"vault_updates":{"new_characters":[{"name":"","appearance":"","personality":"","speech_pattern":""}],"new_world":[{"category":"","name":"","description":""}],"new_timeline":[{"event_summary":"","in_world_time":"","season":""}]}}`,
    },
  ]
}

export async function POST(request: NextRequest) {
  try {
    const { user, supabase, error } = await getAuthUser()
    if (!user) return error

    const creditResult = await useCredits(supabase, user.id, 'ai/review', '원고 리뷰')
    if (!creditResult.success) {
      return NextResponse.json({ error: creditResult.error, remainingCredits: creditResult.remaining }, { status: 402 })
    }

    const { workId, chapterId } = await request.json()
    if (!workId || !chapterId) {
      return NextResponse.json({ error: 'workId, chapterId 필수' }, { status: 400 })
    }

    // Get chapter
    const { data: chapter } = await supabase
      .from('chapters')
      .select('*')
      .eq('id', chapterId)
      .single()
    if (!chapter) {
      return NextResponse.json({ error: '화를 찾을 수 없습니다' }, { status: 404 })
    }

    // Get work
    const { data: work } = await supabase
      .from('works')
      .select('*')
      .eq('id', workId)
      .single()

    // Get previous chapters with full content
    const { data: prevChapters } = await supabase
      .from('chapters')
      .select('number, title, content, summary')
      .eq('work_id', workId)
      .lt('number', chapter.number)
      .order('number', { ascending: false })
      .limit(5)

    // Get all chapter summaries
    const { data: allSummaries } = await supabase
      .from('chapters')
      .select('number, title, summary')
      .eq('work_id', workId)
      .lt('number', chapter.number)
      .not('summary', 'is', null)
      .order('number')

    // Get vault data
    const [chars, foreshadows, world, timeline] = await Promise.all([
      supabase.from('vault_characters').select('name, appearance, personality, is_alive, speech_pattern').eq('work_id', workId),
      supabase.from('vault_foreshadows').select('summary, status, planted_chapter').eq('work_id', workId),
      supabase.from('vault_world').select('category, name, description').eq('work_id', workId),
      supabase.from('vault_timeline').select('chapter, event_summary, in_world_time, season').eq('work_id', workId).order('chapter'),
    ])

    const vault = {
      characters: chars.data || [],
      foreshadows: foreshadows.data || [],
      world: world.data || [],
      timeline: timeline.data || [],
    }

    const plain = (chapter.content || '').replace(/<[^>]*>/g, '')

    // Build context with summaries + full recent chapters
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

    const context = `작품:${work?.title}(${work?.work_type},${work?.genre},스타일:${work?.style_preset})
StoryVault:${JSON.stringify(vault)}
${summaryContext}
[최근 5화 전문]
${recentFullContent}
[현재 ${chapter.number}화]
${plain}`

    // Run all modules in parallel
    const modules = getReviewModules(work?.work_type || 'novel')
    const results = await Promise.allSettled(
      modules.map((m) =>
        callGemini(m.system, context).then((r) => ({ ...parseJSON(r), _module: m.id }))
      )
    )

    // Aggregate results
    const allIssues: Array<{ type: string; severity: string; description: string; location?: string; suggestion?: string; module?: string }> = []
    let tensionScore = 0
    let popularityTips: string[] = []
    let cliffhangerScore = 0
    let pacingWarning = ''
    const vaultUpdates: {
      new_characters: Array<{ name: string; appearance?: string; personality?: string; speech_pattern?: string }>
      new_foreshadows: Array<{ summary: string; chapter?: number }>
      new_world: Array<{ category: string; name: string; description?: string }>
      new_timeline: Array<{ event_summary: string; in_world_time?: string; season?: string }>
    } = { new_characters: [], new_foreshadows: [], new_world: [], new_timeline: [] }

    results.forEach((r, i) => {
      const mod = modules[i]
      if (r.status === 'fulfilled' && r.value) {
        const v = r.value as {
          issues?: Array<{ type: string; severity: string; description: string; location?: string; suggestion?: string }>
          tension_score?: number
          popularity_tips?: string[]
          cliffhanger_score?: number
          pacing_warning?: string
          vault_updates?: typeof vaultUpdates
        }
        (v.issues || []).forEach((is) => allIssues.push({ ...is, module: mod.id }))
        if (v.tension_score) tensionScore = v.tension_score
        if (v.popularity_tips) popularityTips.push(...v.popularity_tips.filter(Boolean))
        if (v.cliffhanger_score) cliffhangerScore = v.cliffhanger_score
        if (v.pacing_warning) pacingWarning = v.pacing_warning
        if (v.vault_updates) {
          if (v.vault_updates.new_characters) vaultUpdates.new_characters.push(...v.vault_updates.new_characters)
          if (v.vault_updates.new_foreshadows) vaultUpdates.new_foreshadows.push(...v.vault_updates.new_foreshadows)
          if (v.vault_updates.new_world) vaultUpdates.new_world.push(...v.vault_updates.new_world)
          if (v.vault_updates.new_timeline) vaultUpdates.new_timeline.push(...v.vault_updates.new_timeline)
        }
      }
    })

    // Deduplicate issues
    const seen = new Set<string>()
    const dedupIssues = allIssues.filter((is) => {
      const key = is.description?.substring(0, 40)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    // Sort by severity
    const sevOrder: Record<string, number> = { critical: 0, warning: 1, info: 2, suggestion: 3 }
    dedupIssues.sort((a, b) => (sevOrder[a.severity] ?? 9) - (sevOrder[b.severity] ?? 9))

    const parsed = {
      issues: dedupIssues,
      tension_score: tensionScore,
      cliffhanger_score: cliffhangerScore,
      pacing_warning: pacingWarning,
      popularity_tips: popularityTips,
      vault_updates: vaultUpdates,
      overall_feedback: `7개 모듈 분석 완료. ${dedupIssues.length}건 이슈, 텐션 ${tensionScore}/10`,
    }

    // Save review history
    await supabase.from('review_history').insert({
      work_id: workId,
      chapter_id: chapterId,
      issues: parsed,
      tension_score: tensionScore,
    })

    // Auto-apply vault updates (if not manual mode)
    if (work?.vault_mode !== 'manual') {
      for (const nc of vaultUpdates.new_characters) {
        if (nc.name) {
          const { data: existing } = await supabase
            .from('vault_characters')
            .select('id')
            .eq('work_id', workId)
            .eq('name', nc.name)
            .single()
          if (!existing) {
            await supabase.from('vault_characters').insert({
              work_id: workId,
              name: nc.name,
              appearance: nc.appearance || '',
              personality: nc.personality || '',
              speech_pattern: nc.speech_pattern || '',
              first_appearance: chapter.number,
            })
          }
        }
      }

      for (const nf of vaultUpdates.new_foreshadows) {
        if (nf.summary) {
          await supabase.from('vault_foreshadows').insert({
            work_id: workId,
            summary: nf.summary,
            planted_chapter: nf.chapter || chapter.number,
          })
        }
      }

      for (const nw of vaultUpdates.new_world) {
        if (nw.name) {
          const { data: existing } = await supabase
            .from('vault_world')
            .select('id')
            .eq('work_id', workId)
            .eq('name', nw.name)
            .single()
          if (!existing) {
            await supabase.from('vault_world').insert({
              work_id: workId,
              category: nw.category || 'other',
              name: nw.name,
              description: nw.description || '',
            })
          }
        }
      }

      for (const nt of vaultUpdates.new_timeline) {
        if (nt.event_summary) {
          await supabase.from('vault_timeline').insert({
            work_id: workId,
            chapter: chapter.number,
            event_summary: nt.event_summary,
            in_world_time: nt.in_world_time || '',
            season: nt.season || '미상',
          })
        }
      }
    }

    // Auto-generate chapter summary
    try {
      const summaryResult = await callGemini(
        '웹소설 요약 전문가. 핵심만 간결하게. JSON만: {"summary":"1-2문장 요약","keyPoints":["핵심1","핵심2"]}',
        plain.substring(0, 8000)
      )
      const summaryParsed = parseJSON(summaryResult)
      await supabase
        .from('chapters')
        .update({ summary: summaryParsed })
        .eq('id', chapterId)
    } catch (e) {
      console.error('[Auto-summary error]', e)
    }

    return NextResponse.json(parsed)
  } catch (error) {
    console.error('Review error:', error)
    return NextResponse.json({ error: '검수 중 오류 발생' }, { status: 500 })
  }
}
