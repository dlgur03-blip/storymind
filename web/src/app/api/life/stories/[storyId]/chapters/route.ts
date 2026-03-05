// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'

export async function GET(request: NextRequest, { params }: { params: Promise<{ storyId: string }> }) {
  try {
    const { storyId } = await params
    const { user, supabase, error } = await getAuthUser()
    if (!user) return error

    const { data } = await supabase
      .from('life_chapters')
      .select('*')
      .eq('story_id', storyId)
      .order('number')

    return NextResponse.json({ chapters: data || [] })
  } catch (error) {
    console.error('Chapters GET error:', error)
    return NextResponse.json({ error: '챕터 목록 조회 실패' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ storyId: string }> }) {
  try {
    const { storyId } = await params
    const { user, supabase, error } = await getAuthUser()
    if (!user) return error

    // Verify story ownership
    const { data: story } = await supabase
      .from('life_stories')
      .select('id, user_id')
      .eq('id', storyId)
      .eq('user_id', user.id)
      .single()

    if (!story) {
      return NextResponse.json({ error: '스토리를 찾을 수 없습니다' }, { status: 404 })
    }

    // Get next chapter number
    const { count } = await supabase
      .from('life_chapters')
      .select('*', { count: 'exact', head: true })
      .eq('story_id', storyId)

    const number = (count || 0) + 1

    const { data, error: dbError } = await supabase
      .from('life_chapters')
      .insert({
        story_id: storyId,
        number,
        title: `챕터 ${number}`,
      })
      .select()
      .single()

    if (dbError) throw dbError

    // Update story chapter count
    await supabase
      .from('life_stories')
      .update({ total_chapters: number })
      .eq('id', storyId)

    return NextResponse.json({ chapter: data })
  } catch (error) {
    console.error('Chapter POST error:', error)
    return NextResponse.json({ error: '챕터 생성 실패' }, { status: 500 })
  }
}
