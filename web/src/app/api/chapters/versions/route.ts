// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const { user, supabase, error } = await getAuthUser()
    if (!user) return error

    const chapterId = request.nextUrl.searchParams.get('chapterId')
    if (!chapterId) return NextResponse.json({ error: 'chapterId 필수' }, { status: 400 })

    const { data: versions } = await supabase
      .from('chapter_versions')
      .select('*')
      .eq('chapter_id', chapterId)
      .order('created_at', { ascending: false })
      .limit(20)

    return NextResponse.json({ versions: versions || [] })
  } catch (error) {
    console.error('Versions error:', error)
    return NextResponse.json({ error: '버전 조회 중 오류 발생' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, supabase, error } = await getAuthUser()
    if (!user) return error

    const { chapterId, action, versionId } = await request.json()

    if (action === 'restore' && versionId) {
      const { data: version } = await supabase
        .from('chapter_versions')
        .select('content, word_count')
        .eq('id', versionId)
        .single()

      if (!version) return NextResponse.json({ error: '버전을 찾을 수 없습니다' }, { status: 404 })

      // Save current as new version before restoring
      const { data: chapter } = await supabase
        .from('chapters')
        .select('content, word_count')
        .eq('id', chapterId)
        .single()

      if (chapter?.content) {
        await supabase.from('chapter_versions').insert({
          chapter_id: chapterId,
          content: chapter.content,
          word_count: chapter.word_count || 0,
        })
      }

      // Restore
      await supabase
        .from('chapters')
        .update({ content: version.content, word_count: version.word_count })
        .eq('id', chapterId)

      return NextResponse.json({ success: true, content: version.content })
    }

    return NextResponse.json({ error: '유효하지 않은 요청' }, { status: 400 })
  } catch (error) {
    console.error('Version restore error:', error)
    return NextResponse.json({ error: '버전 복원 중 오류 발생' }, { status: 500 })
  }
}
