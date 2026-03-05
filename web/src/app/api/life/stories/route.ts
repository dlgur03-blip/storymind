// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'

export async function GET() {
  try {
    const { user, supabase, error } = await getAuthUser()
    if (!user) return error

    const { data } = await supabase
      .from('life_stories')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    return NextResponse.json({ stories: data || [] })
  } catch (error) {
    console.error('Stories GET error:', error)
    return NextResponse.json({ error: '스토리 목록 조회 실패' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, supabase, error } = await getAuthUser()
    if (!user) return error

    const body = await request.json()
    const { title, genre, description } = body

    if (!title?.trim()) {
      return NextResponse.json({ error: '제목을 입력하세요' }, { status: 400 })
    }

    const { data, error: dbError } = await supabase
      .from('life_stories')
      .insert({
        user_id: user.id,
        title: title.trim(),
        genre: genre || '',
        description: description || '',
      })
      .select()
      .single()

    if (dbError) throw dbError

    // Update profile story count
    await supabase.rpc('', {}).catch(() => {})
    const { count } = await supabase
      .from('life_stories')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
    await supabase
      .from('life_profiles')
      .update({ total_stories: count || 0 })
      .eq('user_id', user.id)

    return NextResponse.json({ story: data })
  } catch (error) {
    console.error('Stories POST error:', error)
    return NextResponse.json({ error: '스토리 생성 실패' }, { status: 500 })
  }
}
