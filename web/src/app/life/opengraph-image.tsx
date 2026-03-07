import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'StoryLife - 여러분의 일기가, 소설이 됩니다'
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
          background: 'linear-gradient(145deg, #1a0a10 0%, #1c0f14 30%, #0f0a0d 100%)',
          fontFamily: 'sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Ambient glows */}
        <div
          style={{
            position: 'absolute',
            top: '-200px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '800px',
            height: '600px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(244,63,94,0.15) 0%, transparent 60%)',
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-200px',
            left: '20%',
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(249,115,22,0.08) 0%, transparent 60%)',
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-100px',
            right: '10%',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(236,72,153,0.06) 0%, transparent 60%)',
            display: 'flex',
          }}
        />

        {/* Top gradient bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: 'linear-gradient(90deg, transparent 5%, #f43f5e 25%, #ec4899 50%, #f97316 75%, transparent 95%)',
            display: 'flex',
          }}
        />

        {/* Floating quote marks decoration */}
        <div
          style={{
            position: 'absolute',
            top: '80px',
            left: '120px',
            fontSize: '120px',
            fontWeight: 800,
            color: 'rgba(244,63,94,0.06)',
            lineHeight: 1,
            display: 'flex',
          }}
        >
          "
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: '60px',
            right: '120px',
            fontSize: '120px',
            fontWeight: 800,
            color: 'rgba(244,63,94,0.06)',
            lineHeight: 1,
            display: 'flex',
          }}
        >
          "
        </div>

        {/* Heart + Book icon */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '32px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '60px',
              height: '60px',
              borderRadius: '16px',
              background: 'rgba(244,63,94,0.12)',
              border: '1px solid rgba(244,63,94,0.2)',
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="#f43f5e" stroke="none">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: '28px',
              fontWeight: 700,
              color: '#f43f5e',
              letterSpacing: '-0.5px',
            }}
          >
            StoryLife
          </div>
        </div>

        {/* Main tagline - two lines */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            marginBottom: '8px',
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: '58px',
              fontWeight: 800,
              letterSpacing: '-2px',
              color: '#ffffff',
            }}
          >
            여러분의 일기가,
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: '58px',
              fontWeight: 800,
              letterSpacing: '-2px',
              background: 'linear-gradient(135deg, #f43f5e 0%, #ec4899 40%, #f97316 100%)',
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
            color: 'rgba(255,255,255,0.4)',
            marginBottom: '44px',
            fontWeight: 400,
          }}
        >
          오늘 있었던 일을 AI에게 말해보세요
        </div>

        {/* How it works - 3 steps */}
        <div
          style={{
            display: 'flex',
            gap: '16px',
          }}
        >
          {[
            { num: '1', text: '오늘의 이야기를 들려주세요' },
            { num: '2', text: 'AI가 소설로 만들어줍니다' },
            { num: '3', text: '커뮤니티에 공유하세요' },
          ].map((step) => (
            <div
              key={step.num}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 20px',
                borderRadius: '100px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'rgba(244,63,94,0.2)',
                  color: '#f43f5e',
                  fontSize: '13px',
                  fontWeight: 700,
                }}
              >
                {step.num}
              </div>
              <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '15px', fontWeight: 500 }}>
                {step.text}
              </span>
            </div>
          ))}
        </div>

        {/* Domain */}
        <div
          style={{
            position: 'absolute',
            bottom: '28px',
            display: 'flex',
            fontSize: '16px',
            color: 'rgba(255,255,255,0.2)',
          }}
        >
          storymind.co.kr/life
        </div>
      </div>
    ),
    { ...size }
  )
}
