// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { user, supabase, error } = await getAuthUser()
    if (!user) return error

    const { id } = await context.params

    // Get current plan
    const { data: plan } = await supabase
      .from('story_plans')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!plan) {
      return NextResponse.json({ error: '플랜을 찾을 수 없습니다' }, { status: 404 })
    }

    const conti = Array.isArray(plan.conti) ? plan.conti : []
    if (conti.length === 0) {
      return NextResponse.json({ error: '콘티가 없습니다. 먼저 콘티를 생성해주세요.' }, { status: 400 })
    }

    // 1. Create a new work
    const { data: work, error: workError } = await supabase
      .from('works')
      .insert({
        user_id: user.id,
        title: plan.title || '새 작품',
        genre: plan.genre || '',
        style_preset: 'action',
        work_type: 'novel',
      })
      .select()
      .single()

    if (workError || !work) {
      return NextResponse.json({ error: '작품 생성 실패: ' + (workError?.message || '') }, { status: 500 })
    }

    // 2. Create chapters from conti
    const chapterInserts = conti.map((ep: any, idx: number) => ({
      work_id: work.id,
      number: idx + 1,
      title: ep.title || `제${idx + 1}화`,
      content: '',
    }))

    const { error: chapterError } = await supabase
      .from('chapters')
      .insert(chapterInserts)

    if (chapterError) {
      console.error('Chapter insert error:', chapterError)
    }

    // 3. Create vault characters from plan characters
    const characters = Array.isArray(plan.characters) ? plan.characters : []
    for (const char of characters) {
      if (char.name) {
        await supabase.from('vault_characters').insert({
          work_id: work.id,
          name: char.name,
          appearance: char.appearance || '',
          personality: char.personality || '',
          speech_pattern: char.speech_pattern || '',
          first_appearance: 1,
        })
      }
    }

    // 4. Create vault world from plan world
    const worldItems = Array.isArray(plan.world) ? plan.world : []
    for (const item of worldItems) {
      if (item.name) {
        await supabase.from('vault_world').insert({
          work_id: work.id,
          category: item.category || 'other',
          name: item.name,
          description: item.description || '',
        })
      }
    }

    // 5. Create vault foreshadows from plan foreshadows
    const foreshadows = Array.isArray(plan.foreshadows) ? plan.foreshadows : []
    for (const fs of foreshadows) {
      if (fs.summary) {
        await supabase.from('vault_foreshadows').insert({
          work_id: work.id,
          summary: fs.summary,
          planted_chapter: fs.planted_episode || 1,
          status: 'open',
        })
      }
    }

    // 6. Link plan to work
    await supabase
      .from('story_plans')
      .update({ work_id: work.id, status: 'finalized' })
      .eq('id', id)

    return NextResponse.json({
      success: true,
      work,
      chaptersCreated: conti.length,
      charactersCreated: characters.filter((c: any) => c.name).length,
      worldItemsCreated: worldItems.filter((w: any) => w.name).length,
      foreshadowsCreated: foreshadows.filter((f: any) => f.summary).length,
    })
  } catch (error) {
    console.error('Finalize error:', error)
    return NextResponse.json({ error: '작품 변환 중 오류 발생' }, { status: 500 })
  }
}
