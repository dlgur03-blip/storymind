// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { user, supabase, error } = await getAuthUser()
    if (!user) return error

    const { id } = await context.params

    const { data: plan } = await supabase
      .from('story_plans')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!plan) {
      return NextResponse.json({ error: '플랜을 찾을 수 없습니다' }, { status: 404 })
    }

    return NextResponse.json({ plan })
  } catch (error) {
    console.error('Plan get error:', error)
    return NextResponse.json({ error: '플랜 조회 중 오류 발생' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { user, supabase, error } = await getAuthUser()
    if (!user) return error

    const { id } = await context.params

    const { error: deleteError } = await supabase
      .from('story_plans')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Plan delete error:', error)
    return NextResponse.json({ error: '플랜 삭제 중 오류 발생' }, { status: 500 })
  }
}
