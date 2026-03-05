// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { ImageResponse } from 'next/og'
import { createServerSupabase } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const chapterId = searchParams.get('chapterId')

    if (!chapterId) {
      return NextResponse.json({ error: 'chapterId 필요' }, { status: 400 })
    }

    const supabase = await createServerSupabase()

    const { data: chapter } = await supabase
      .from('life_chapters')
      .select('title, content, story_id, number')
      .eq('id', chapterId)
      .single()

    if (!chapter) {
      return NextResponse.json({ error: '챕터를 찾을 수 없습니다' }, { status: 404 })
    }

    const { data: story } = await supabase
      .from('life_stories')
      .select('title, genre, user_id')
      .eq('id', chapter.story_id)
      .single()

    const { data: profile } = await supabase
      .from('life_profiles')
      .select('display_name')
      .eq('user_id', story?.user_id || '')
      .single()

    const excerpt = (chapter.content || '').slice(0, 300)

    return new ImageResponse(
      (
        <div
          style={{
            width: '1080px',
            height: '1920px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            background: 'linear-gradient(180deg, #f43f5e 0%, #ec4899 40%, #f97316 100%)',
            padding: '80px',
          }}
        >
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '60px' }}>
            <div style={{ fontSize: '36px', color: 'white', fontWeight: 'bold' }}>StoryLife</div>
          </div>

          {/* Card */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              background: 'rgba(255,255,255,0.95)',
              borderRadius: '32px',
              padding: '60px',
              width: '100%',
              maxWidth: '920px',
              flex: '1',
              maxHeight: '1400px',
            }}
          >
            {/* Genre badge */}
            {story?.genre && (
              <div style={{
                display: 'flex',
                fontSize: '20px',
                color: '#f43f5e',
                background: '#fff1f2',
                padding: '8px 20px',
                borderRadius: '100px',
                alignSelf: 'flex-start',
                marginBottom: '24px',
              }}>
                {story.genre}
              </div>
            )}

            {/* Story title */}
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#171717', marginBottom: '8px' }}>
              {story?.title || ''}
            </div>

            {/* Chapter info */}
            <div style={{ fontSize: '22px', color: '#f43f5e', marginBottom: '40px' }}>
              챕터 {chapter.number}: {chapter.title}
            </div>

            {/* Excerpt */}
            <div style={{
              fontSize: '24px',
              color: '#404040',
              lineHeight: '1.8',
              flex: '1',
              overflow: 'hidden',
            }}>
              {excerpt}...
            </div>

            {/* Author */}
            <div style={{ fontSize: '20px', color: '#a3a3a3', marginTop: '40px' }}>
              by {profile?.display_name || '익명'}
            </div>
          </div>

          {/* CTA */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginTop: '40px',
            fontSize: '22px',
            color: 'rgba(255,255,255,0.9)',
          }}>
            storymind.co.kr에서 더 읽기
          </div>
        </div>
      ),
      {
        width: 1080,
        height: 1920,
      }
    )
  } catch (error) {
    console.error('Share card error:', error)
    return NextResponse.json({ error: '카드 생성 실패' }, { status: 500 })
  }
}
