// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { user, supabase, error } = await getAuthUser()
    if (!user) return error

    const { id } = await context.params
    const { conti } = await request.json()

    if (!Array.isArray(conti)) {
      return NextResponse.json({ error: 'conti는 배열이어야 합니다' }, { status: 400 })
    }

    const { error: updateError } = await supabase
      .from('story_plans')
      .update({ conti })
      .eq('id', id)
      .eq('user_id', user.id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, conti })
  } catch (error) {
    console.error('Conti update error:', error)
    return NextResponse.json({ error: '콘티 수정 중 오류 발생' }, { status: 500 })
  }
}
