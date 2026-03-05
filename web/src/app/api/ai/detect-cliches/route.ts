// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { callGemini, parseJSON } from '@/lib/gemini'

const CLICHE_PATTERNS = [
  { pattern: /눈을?\s*떴다|눈을?\s*뜨니/g, type: 'expression', desc: '눈을 뜨는 장면 (회귀물 클리셰)' },
  { pattern: /이게?\s*무슨|이것이?\s*무슨/g, type: 'expression', desc: '놀라는 반응 패턴' },
  { pattern: /말도?\s*안\s*[되돼]/g, type: 'expression', desc: '놀람 표현 반복' },
  { pattern: /뭐야?\s*이건?|이건?\s*뭐야/g, type: 'expression', desc: '놀람/의문 클리셰' },
  { pattern: /전생|회귀|되돌아|과거로/g, type: 'plot', desc: '회귀/전생 전개' },
  { pattern: /[시S]스템?\s*창?\s*이?/g, type: 'plot', desc: '시스템 창 등장' },
  { pattern: /천재|먼치킨|사기캐/g, type: 'character', desc: '먼치킨 캐릭터 설정' },
  { pattern: /은발|금발|흑발.*?미녀|미남/g, type: 'appearance', desc: '전형적 외모 묘사' },
  { pattern: /붉은\s*눈|금색\s*눈|은색\s*눈/g, type: 'appearance', desc: '비현실적 눈 색상' },
  { pattern: /떨리는\s*목소리|심장이\s*뛰/g, type: 'expression', desc: '감정 묘사 클리셰' },
  { pattern: /이를?\s*악물|주먹을?\s*쥐/g, type: 'expression', desc: '분노/결의 표현 반복' },
  { pattern: /한숨을?\s*내쉬/g, type: 'expression', desc: '한숨 클리셰' },
  { pattern: /눈물이?\s*흘러|눈물이?\s*떨어/g, type: 'expression', desc: '울음 표현 클리셰' },
  { pattern: /쓴웃음|자조/g, type: 'expression', desc: '쓴웃음 패턴' },
  { pattern: /피가?\s*거꾸로\s*솟/g, type: 'expression', desc: '분노 과장 표현' },
  { pattern: /비범한?\s*아우라|기운이?\s*느껴/g, type: 'character', desc: '아우라/기운 클리셰' },
  { pattern: /눈빛이?\s*변/g, type: 'expression', desc: '눈빛 변화 클리셰' },
  { pattern: /입꼬리가?\s*올라/g, type: 'expression', desc: '입꼬리 올림 반복' },
  { pattern: /심장이?\s*멎|숨이?\s*멎/g, type: 'expression', desc: '과장된 놀람 표현' },
  { pattern: /미간을?\s*찌푸리|미간이?\s*좁/g, type: 'expression', desc: '미간 찌푸림 반복' },
]

export async function POST(request: NextRequest) {
  try {
    const { user, supabase, error } = await getAuthUser()
    if (!user) return error

    const { workId, chapterId, useAI } = await request.json()
    if (!chapterId) return NextResponse.json({ error: 'chapterId 필수' }, { status: 400 })

    const { data: chapter } = await supabase
      .from('chapters')
      .select('content')
      .eq('id', chapterId)
      .single()
    if (!chapter) return NextResponse.json({ error: '화를 찾을 수 없습니다' }, { status: 404 })

    const text = (chapter.content || '').replace(/<[^>]*>/g, '')
    const cliches: Array<{ text: string; type: string; description: string; suggestion?: string }> = []

    // Local regex-based detection
    for (const p of CLICHE_PATTERNS) {
      const matches = text.match(p.pattern)
      if (matches) {
        matches.forEach(m => {
          cliches.push({ text: m, type: p.type, description: p.desc })
        })
      }
    }

    // AI-powered detection if requested
    if (useAI) {
      const system = `웹소설 클리셰 탐지 전문가. 텍스트에서 진부한 표현, 뻔한 전개, 전형적 캐릭터 묘사를 찾으세요.
각 클리셰에 대해 더 신선한 대안을 제안하세요.
JSON만: {"cliches":[{"text":"원문 인용","type":"expression|plot|character|appearance","description":"설명","suggestion":"대안 제안"}]}`

      const result = await callGemini(system, text.substring(0, 10000), { temperature: 0.5, maxOutputTokens: 2048 })
      const parsed = parseJSON(result)
      if (parsed.cliches) {
        cliches.push(...parsed.cliches)
      }
    }

    // Deduplicate
    const seen = new Set<string>()
    const dedupCliches = cliches.filter(c => {
      const key = c.text.substring(0, 20)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    // Count by type
    const byType: Record<string, number> = {}
    dedupCliches.forEach(c => { byType[c.type] = (byType[c.type] || 0) + 1 })

    return NextResponse.json({ cliches: dedupCliches, by_type: byType })
  } catch (error) {
    console.error('Cliche detection error:', error)
    return NextResponse.json({ error: '클리셰 탐지 중 오류 발생' }, { status: 500 })
  }
}
