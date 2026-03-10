import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'StoryMind - 개개인의 이야기가 특별한 세상'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0908',
          fontFamily: 'sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Subtle warm glow — minimal, not flashy */}
        <div
          style={{
            position: 'absolute',
            top: '-200px',
            right: '-200px',
            width: '600px',
            height: '600px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(168,162,158,0.06) 0%, transparent 70%)',
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-200px',
            left: '-200px',
            width: '600px',
            height: '600px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(168,162,158,0.04) 0%, transparent 70%)',
            display: 'flex',
          }}
        />

        {/* Top thin line */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '20%',
            right: '20%',
            height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(168,162,158,0.2), transparent)',
            display: 'flex',
          }}
        />

        {/* Small tagline above */}
        <div
          style={{
            display: 'flex',
            fontSize: '15px',
            fontWeight: 400,
            letterSpacing: '6px',
            color: 'rgba(168,162,158,0.5)',
            textTransform: 'uppercase',
            marginBottom: '28px',
          }}
        >
          개개인의 이야기가 특별한 세상
        </div>

        {/* Logo */}
        <div
          style={{
            display: 'flex',
            fontSize: '64px',
            fontWeight: 600,
            letterSpacing: '-1px',
            color: '#e8e6e1',
            marginBottom: '32px',
          }}
        >
          StoryMind
        </div>

        {/* Main tagline */}
        <div
          style={{
            display: 'flex',
            fontSize: '28px',
            fontWeight: 400,
            color: 'rgba(232,230,225,0.5)',
            letterSpacing: '1px',
          }}
        >
          여러분의 일기가 소설이 됩니다
        </div>

        {/* Bottom branding */}
        <div
          style={{
            position: 'absolute',
            bottom: '32px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: '14px',
              fontWeight: 400,
              letterSpacing: '2px',
              color: 'rgba(168,162,158,0.3)',
            }}
          >
            storymind.co.kr
          </div>
        </div>

        {/* Bottom thin line */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: '20%',
            right: '20%',
            height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(168,162,158,0.2), transparent)',
            display: 'flex',
          }}
        />
      </div>
    ),
    { ...size }
  )
}
