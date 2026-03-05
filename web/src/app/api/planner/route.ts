// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const { user, supabase, error } = await getAuthUser()
    if (!user) return error

    const { data: plans } = await supabase
      .from('story_plans')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    return NextResponse.json({ plans: plans || [] })
  } catch (error) {
    console.error('Planner list error:', error)
    return NextResponse.json({ error: '플랜 목록 조회 중 오류 발생' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, supabase, error } = await getAuthUser()
    if (!user) return error

    const { title, idea_text, genre } = await request.json()

    const { data: plan, error: insertError } = await supabase
      .from('story_plans')
      .insert({
        user_id: user.id,
        title: title || '새 기획',
        idea_text: idea_text || '',
        genre: genre || '',
        status: 'step1',
        current_step: 1,
        analysis: {},
        arcs: {},
        characters: [],
        world: [],
        conti: [],
        foreshadows: [],
        conversation: [],
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 })
    }

    return NextResponse.json({ plan })
  } catch (error) {
    console.error('Planner create error:', error)
    return NextResponse.json({ error: '플랜 생성 중 오류 발생' }, { status: 500 })
  }
}
