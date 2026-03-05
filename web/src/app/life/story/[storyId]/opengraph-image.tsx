// @ts-nocheck
import { ImageResponse } from 'next/og'
import { createServerSupabase } from '@/lib/supabase/server'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OGImage({ params }: { params: Promise<{ storyId: string }> }) {
  const { storyId } = await params
  const supabase = await createServerSupabase()

  const { data: story } = await supabase
    .from('life_stories')
    .select('title, genre, description')
    .eq('id', storyId)
    .single()

  const { data: profile } = await supabase
    .from('life_profiles')
    .select('display_name')
    .eq('user_id', story?.user_id || '')
    .single()

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #f43f5e, #ec4899, #f97316)',
          padding: '60px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            background: 'rgba(255,255,255,0.95)',
            borderRadius: '24px',
            padding: '48px 64px',
            maxWidth: '900px',
            width: '100%',
          }}
        >
          <div style={{ fontSize: '20px', color: '#f43f5e', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            StoryLife
          </div>
          <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#171717', textAlign: 'center', marginBottom: '16px' }}>
            {story?.title || 'StoryLife'}
          </div>
          {story?.genre && (
            <div style={{ fontSize: '18px', color: '#f43f5e', background: '#fff1f2', padding: '6px 16px', borderRadius: '100px', marginBottom: '12px' }}>
              {story.genre}
            </div>
          )}
          {story?.description && (
            <div style={{ fontSize: '16px', color: '#737373', textAlign: 'center', maxWidth: '600px' }}>
              {story.description.slice(0, 100)}
            </div>
          )}
          {profile?.display_name && (
            <div style={{ fontSize: '16px', color: '#a3a3a3', marginTop: '20px' }}>
              by {profile.display_name}
            </div>
          )}
        </div>
      </div>
    ),
    { ...size }
  )
}
