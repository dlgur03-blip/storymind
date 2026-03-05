// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ commentId: string }> }) {
  try {
    const { commentId } = await params
    const { user, supabase, error } = await getAuthUser()
    if (!user) return error

    const { content } = await request.json()

    const { data } = await supabase
      .from('life_comments')
      .update({ content })
      .eq('id', commentId)
      .eq('user_id', user.id)
      .select()
      .single()

    return NextResponse.json({ comment: data })
  } catch (error) {
    console.error('Comment PATCH error:', error)
    return NextResponse.json({ error: '댓글 수정 실패' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ commentId: string }> }) {
  try {
    const { commentId } = await params
    const { user, supabase, error } = await getAuthUser()
    if (!user) return error

    // Soft delete
    await supabase
      .from('life_comments')
      .update({ is_deleted: true, content: '삭제된 댓글입니다' })
      .eq('id', commentId)
      .eq('user_id', user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Comment DELETE error:', error)
    return NextResponse.json({ error: '댓글 삭제 실패' }, { status: 500 })
  }
}
