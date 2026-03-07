import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'StoryMind - 여러분의 일기가, 소설이 됩니다'
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
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Ambient glow - warm */}
        <div
          style={{
            position: 'absolute',
            top: '-100px',
            right: '-100px',
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(244,63,94,0.12) 0%, transparent 70%)',
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-150px',
            left: '-100px',
            width: '600px',
            height: '600px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(249,115,22,0.08) 0%, transparent 70%)',
            display: 'flex',
          }}
        />

        {/* Top accent line */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: 'linear-gradient(90deg, transparent 10%, #f43f5e 30%, #f97316 70%, transparent 90%)',
            display: 'flex',
          }}
        />

        {/* Diary → Novel visual */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '32px',
            marginBottom: '40px',
          }}
        >
          {/* Diary icon */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '72px',
              height: '72px',
              borderRadius: '20px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
              <path d="m15 5 4 4" />
            </svg>
          </div>

          {/* Arrow */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '40px', height: '2px', background: 'linear-gradient(90deg, rgba(244,63,94,0.3), rgba(244,63,94,0.8))', display: 'flex' }} />
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </div>

          {/* Novel icon */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '72px',
              height: '72px',
              borderRadius: '20px',
              background: 'rgba(244,63,94,0.1)',
              border: '1px solid rgba(244,63,94,0.25)',
            }}
          >
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
              <path d="M8 7h6" />
              <path d="M8 11h8" />
            </svg>
          </div>
        </div>

        {/* Main tagline */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: '52px',
              fontWeight: 800,
              letterSpacing: '-1.5px',
              background: 'linear-gradient(135deg, #ffffff 0%, #e5e5e5 100%)',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            여러분의 일기가,
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: '52px',
              fontWeight: 800,
              letterSpacing: '-1.5px',
              background: 'linear-gradient(135deg, #f43f5e 0%, #f97316 100%)',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            소설이 됩니다.
          </div>
        </div>

        {/* Subtitle */}
        <div
          style={{
            display: 'flex',
            fontSize: '22px',
            fontWeight: 400,
            color: 'rgba(255,255,255,0.45)',
            marginTop: '24px',
            marginBottom: '40px',
          }}
        >
          AI와 대화하며 나만의 이야기를 만들어보세요
        </div>

        {/* Feature pills */}
        <div
          style={{
            display: 'flex',
            gap: '10px',
          }}
        >
          {['AI 소설 변환', '커뮤니티 공유', '챕터별 연재', '댓글 & 좋아요'].map((text) => (
            <div
              key={text}
              style={{
                display: 'flex',
                padding: '8px 20px',
                borderRadius: '100px',
                background: 'rgba(244,63,94,0.08)',
                border: '1px solid rgba(244,63,94,0.15)',
                color: 'rgba(255,255,255,0.6)',
                fontSize: '16px',
                fontWeight: 500,
              }}
            >
              {text}
            </div>
          ))}
        </div>

        {/* Bottom branding */}
        <div
          style={{
            position: 'absolute',
            bottom: '28px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: '20px',
              fontWeight: 700,
              color: 'rgba(255,255,255,0.25)',
            }}
          >
            StoryLife
          </div>
          <div
            style={{
              width: '1px',
              height: '16px',
              background: 'rgba(255,255,255,0.15)',
              display: 'flex',
            }}
          />
          <div
            style={{
              display: 'flex',
              fontSize: '16px',
              color: 'rgba(255,255,255,0.2)',
            }}
          >
            storymind.co.kr
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
