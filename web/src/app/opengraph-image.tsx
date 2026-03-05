import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'StoryMind - AI 웹소설 어시스턴트'
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
          background: 'linear-gradient(145deg, #0a0a0a 0%, #1a1a1a 50%, #0a0a0a 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Background pattern */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            opacity: 0.06,
            backgroundImage: 'radial-gradient(circle at 25% 25%, #ffffff 1px, transparent 1px), radial-gradient(circle at 75% 75%, #ffffff 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        {/* Top accent line */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, transparent, #ffffff, transparent)',
          }}
        />

        {/* Icon */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '88px',
            height: '88px',
            borderRadius: '24px',
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.15)',
            marginBottom: '32px',
          }}
        >
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
            <path d="M8 7h6" />
            <path d="M8 11h8" />
          </svg>
        </div>

        {/* Title */}
        <div
          style={{
            display: 'flex',
            fontSize: '64px',
            fontWeight: 800,
            color: '#ffffff',
            letterSpacing: '-2px',
            marginBottom: '16px',
          }}
        >
          StoryMind
        </div>

        {/* Subtitle */}
        <div
          style={{
            display: 'flex',
            fontSize: '26px',
            fontWeight: 400,
            color: 'rgba(255,255,255,0.6)',
            marginBottom: '48px',
          }}
        >
          AI 웹소설 어시스턴트
        </div>

        {/* Feature pills */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
          }}
        >
          {['설정 자동 추적', '모순 탐지', 'AI 대필', '스토리 기획', '텐션 분석'].map((text) => (
            <div
              key={text}
              style={{
                display: 'flex',
                padding: '10px 22px',
                borderRadius: '100px',
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.7)',
                fontSize: '18px',
                fontWeight: 500,
              }}
            >
              {text}
            </div>
          ))}
        </div>

        {/* Domain */}
        <div
          style={{
            position: 'absolute',
            bottom: '32px',
            display: 'flex',
            fontSize: '18px',
            color: 'rgba(255,255,255,0.3)',
            fontWeight: 400,
          }}
        >
          storymind.co.kr
        </div>
      </div>
    ),
    { ...size }
  )
}
