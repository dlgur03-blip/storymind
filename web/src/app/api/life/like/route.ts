// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { user, supabase, error } = await getAuthUser()
    if (!user) return error

    const { story_id, chapter_id } = await request.json()

    if (!story_id && !chapter_id) {
      return NextResponse.json({ error: '대상을 지정하세요' }, { status: 400 })
    }

    // Check existing like
    let query = supabase.from('life_likes').select('id').eq('user_id', user.id)
    if (story_id) query = query.eq('story_id', story_id)
    if (chapter_id) query = query.eq('chapter_id', chapter_id)
    const { data: existing } = await query.maybeSingle()

    if (existing) {
      // Unlike
      await supabase.from('life_likes').delete().eq('id', existing.id)

      // Decrement counter
      if (story_id) {
        const { data: s } = await supabase.from('life_stories').select('total_likes').eq('id', story_id).single()
        await supabase.from('life_stories').update({ total_likes: Math.max(0, (s?.total_likes || 1) - 1) }).eq('id', story_id)
      }
      if (chapter_id) {
        const { data: c } = await supabase.from('life_chapters').select('total_likes').eq('id', chapter_id).single()
        await supabase.from('life_chapters').update({ total_likes: Math.max(0, (c?.total_likes || 1) - 1) }).eq('id', chapter_id)
      }

      return NextResponse.json({ liked: false })
    } else {
      // Like
      const insertData: any = { user_id: user.id }
      if (story_id) insertData.story_id = story_id
      if (chapter_id) insertData.chapter_id = chapter_id

      await supabase.from('life_likes').insert(insertData)

      // Increment counter
      if (story_id) {
        const { data: s } = await supabase.from('life_stories').select('total_likes, user_id').eq('id', story_id).single()
        await supabase.from('life_stories').update({ total_likes: (s?.total_likes || 0) + 1 }).eq('id', story_id)

        // Notify author
        if (s?.user_id && s.user_id !== user.id) {
          await supabase.from('life_notifications').insert({
            user_id: s.user_id,
            type: 'like',
            actor_id: user.id,
            story_id,
            message: '회원님의 스토리에 좋아요를 눌렀습니다',
          })
        }
      }
      if (chapter_id) {
        const { data: c } = await supabase.from('life_chapters').select('total_likes, story_id').eq('id', chapter_id).single()
        await supabase.from('life_chapters').update({ total_likes: (c?.total_likes || 0) + 1 }).eq('id', chapter_id)

        // Notify author
        if (c?.story_id) {
          const { data: s } = await supabase.from('life_stories').select('user_id').eq('id', c.story_id).single()
          if (s?.user_id && s.user_id !== user.id) {
            await supabase.from('life_notifications').insert({
              user_id: s.user_id,
              type: 'like',
              actor_id: user.id,
              chapter_id,
              message: '회원님의 챕터에 좋아요를 눌렀습니다',
            })
          }
        }
      }

      return NextResponse.json({ liked: true })
    }
  } catch (error) {
    console.error('Like error:', error)
    return NextResponse.json({ error: '좋아요 처리 실패' }, { status: 500 })
  }
}
