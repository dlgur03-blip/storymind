// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const { user, supabase, error } = await getAuthUser()
    if (!user) return error

    const workId = request.nextUrl.searchParams.get('workId')
    if (!workId) return NextResponse.json({ error: 'workId 필수' }, { status: 400 })

    const { data } = await supabase
      .from('vault_address_matrix')
      .select('*')
      .eq('work_id', workId)
      .order('from_character')

    return NextResponse.json({ matrix: data || [] })
  } catch (error) {
    console.error('Address matrix error:', error)
    return NextResponse.json({ error: '호칭 매트릭스 조회 오류' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, supabase, error } = await getAuthUser()
    if (!user) return error

    const { workId, fromCharacter, toCharacter, address, context } = await request.json()
    if (!workId || !fromCharacter || !toCharacter || !address) {
      return NextResponse.json({ error: '필수 필드 누락' }, { status: 400 })
    }

    const { data } = await supabase
      .from('vault_address_matrix')
      .insert({ work_id: workId, from_character: fromCharacter, to_character: toCharacter, address, context: context || '' })
      .select()
      .single()

    return NextResponse.json({ entry: data })
  } catch (error) {
    console.error('Address matrix insert error:', error)
    return NextResponse.json({ error: '호칭 추가 오류' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { user, supabase, error } = await getAuthUser()
    if (!user) return error

    const { id } = await request.json()
    if (!id) return NextResponse.json({ error: 'id 필수' }, { status: 400 })

    await supabase.from('vault_address_matrix').delete().eq('id', id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Address matrix delete error:', error)
    return NextResponse.json({ error: '호칭 삭제 오류' }, { status: 500 })
  }
}
