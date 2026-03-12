// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { callGemini, parseJSON } from '@/lib/gemini'
import { useCredits } from '@/lib/credits'

export async function POST(request: NextRequest) {
  try {
    const { user, supabase, error } = await getAuthUser()
    if (!user) return error

    const creditResult = await useCredits(supabase, user.id, 'ai/extract', '키워드 추출')
    if (!creditResult.success) {
      return NextResponse.json({ error: creditResult.error, remainingCredits: creditResult.remaining }, { status: 402 })
    }

    const { workId, chapterId } = await request.json()
    if (!workId || !chapterId) {
      return NextResponse.json({ error: 'workId, chapterId 필수' }, { status: 400 })
    }

    const { data: chapterData } = await supabase
      .from('chapters')
      .select('*')
      .eq('id', chapterId)
      .single()
    if (!chapterData) {
      return NextResponse.json({ error: '화를 찾을 수 없습니다' }, { status: 404 })
    }
    const chapter = chapterData

    const { data: work } = await supabase
      .from('works')
      .select('*')
      .eq('id', workId)
      .single()

    const plain = ((chapter.content as string) || '').replace(/<[^>]*>/g, '')

    const system = `설정 추출 전문가. 텍스트에서 스토리 설정을 추출하세요.

JSON 형식으로 반환:
{
  "characters": [
    {
      "name": "캐릭터 이름",
      "appearance": "외모 묘사",
      "personality": "성격 특성",
      "speech_pattern": "말투 특징",
      "abilities": "능력/직업"
    }
  ],
  "world": [
    {
      "category": "location|organization|item|magic|species|other",
      "name": "이름",
      "description": "설명"
    }
  ],
  "timeline": [
    {
      "event_summary": "이벤트 요약",
      "in_world_time": "작품 내 시간 (예: 3년 전, 봄)",
      "season": "봄|여름|가을|겨울|미상"
    }
  ],
  "foreshadows": [
    {
      "summary": "복선 내용",
      "hint_text": "원문에서 복선이 있는 부분"
    }
  ],
  "summary": {
    "summary": "1-2문장 요약",
    "keyPoints": ["핵심 포인트1", "핵심 포인트2"]
  }
}`

    const result = await callGemini(system, plain, { temperature: 0.3, maxOutputTokens: 3000 })
    const parsed = parseJSON(result)

    if (work?.vault_mode !== 'manual') {
      for (const c of (parsed.characters || [])) {
        if (c.name) {
          const { data: existing } = await supabase
            .from('vault_characters')
            .select('id')
            .eq('work_id', workId)
            .eq('name', c.name)
            .single()

          if (!existing) {
            await supabase.from('vault_characters').insert({
              work_id: workId,
              name: c.name,
              appearance: c.appearance || '',
              personality: c.personality || '',
              speech_pattern: c.speech_pattern || '',
              abilities: c.abilities || '',
              first_appearance: chapter.number,
            })
          }
        }
      }

      for (const w of (parsed.world || [])) {
        if (w.name) {
          const { data: existing } = await supabase
            .from('vault_world')
            .select('id')
            .eq('work_id', workId)
            .eq('name', w.name)
            .single()

          if (!existing) {
            await supabase.from('vault_world').insert({
              work_id: workId,
              category: w.category || 'other',
              name: w.name,
              description: w.description || '',
            })
          }
        }
      }

      for (const t of (parsed.timeline || [])) {
        if (t.event_summary) {
          await supabase.from('vault_timeline').insert({
            work_id: workId,
            chapter: chapter.number,
            event_summary: t.event_summary,
            in_world_time: t.in_world_time || '',
            season: t.season || '미상',
          })
        }
      }

      for (const f of (parsed.foreshadows || [])) {
        if (f.summary) {
          await supabase.from('vault_foreshadows').insert({
            work_id: workId,
            summary: f.summary,
            planted_chapter: chapter.number,
          })
        }
      }
    }

    if (parsed.summary) {
      await supabase
        .from('chapters')
        .update({ summary: parsed.summary })
        .eq('id', chapterId)
    }

    return NextResponse.json({
      extracted: parsed,
      message: work?.vault_mode === 'manual'
        ? '추출 완료 (수동 모드: Vault에 자동 추가되지 않음)'
        : '추출 및 Vault 업데이트 완료',
    })
  } catch (error) {
    console.error('Extract error:', error)
    return NextResponse.json({ error: '설정 추출 중 오류 발생' }, { status: 500 })
  }
}
