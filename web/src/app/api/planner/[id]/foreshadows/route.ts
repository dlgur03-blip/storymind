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
    const { foreshadows } = await request.json()

    if (!Array.isArray(foreshadows)) {
      return NextResponse.json({ error: 'foreshadows는 배열이어야 합니다' }, { status: 400 })
    }

    const { error: updateError } = await supabase
      .from('story_plans')
      .update({ foreshadows })
      .eq('id', id)
      .eq('user_id', user.id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, foreshadows })
  } catch (error) {
    console.error('Foreshadows update error:', error)
    return NextResponse.json({ error: '복선 수정 중 오류 발생' }, { status: 500 })
  }
}
