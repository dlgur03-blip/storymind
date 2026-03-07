'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase/client'
import { BookOpen, Sparkles, Shield, Zap, Check } from 'lucide-react'

export default function Home() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLogin, setIsLogin] = useState(true)
  const [error, setError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = getSupabase()
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.push('/home')
      } else {
        setLoading(false)
      }
    }
    checkAuth()
  }, [router])

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setAuthLoading(true)
    const supabase = getSupabase()

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
      }
      router.push('/home')
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다')
    } finally {
      setAuthLoading(false)
    }
  }

  const handleGoogleAuth = async () => {
    const supabase = getSupabase()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/home` }
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="w-6 h-6 border-2 border-stone-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-4 py-20">
        <div className="text-center mb-20">
          <h1 className="font-serif text-4xl md:text-5xl font-medium tracking-tight text-stone-800 dark:text-stone-200 mb-4">
            StoryMind
          </h1>
          <p className="text-lg text-stone-500 dark:text-stone-400 mb-6">
            AI 기반 웹소설/웹툰 창작 어시스턴트
          </p>
          <p className="text-sm text-stone-400 dark:text-stone-500 max-w-xl mx-auto leading-relaxed">
            설정 자동 추적, 모순 탐지, AI 대필까지.<br />
            당신의 이야기에만 집중하세요. 나머지는 StoryMind가 관리합니다.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-16 items-start">
          {/* Features */}
          <div className="space-y-5">
            <h2 className="font-serif text-xl font-medium mb-6 text-stone-700 dark:text-stone-300">주요 기능</h2>

            <div className="flex gap-4 p-5 bg-white/60 dark:bg-stone-900/40 rounded-2xl border border-stone-200/60 dark:border-stone-800/40 card-hover">
              <div className="w-10 h-10 bg-stone-100 dark:bg-stone-800 rounded-xl flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5 text-stone-600 dark:text-stone-400" />
              </div>
              <div>
                <h3 className="font-medium mb-1 text-stone-700 dark:text-stone-300">StoryVault</h3>
                <p className="text-sm text-stone-400 dark:text-stone-500 leading-relaxed">캐릭터, 복선, 세계관, 시간선 자동 추적. AI가 설정을 기억합니다.</p>
              </div>
            </div>

            <div className="flex gap-4 p-5 bg-white/60 dark:bg-stone-900/40 rounded-2xl border border-stone-200/60 dark:border-stone-800/40 card-hover">
              <div className="w-10 h-10 bg-stone-100 dark:bg-stone-800 rounded-xl flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-stone-600 dark:text-stone-400" />
              </div>
              <div>
                <h3 className="font-medium mb-1 text-stone-700 dark:text-stone-300">7모듈 AI 검수</h3>
                <p className="text-sm text-stone-400 dark:text-stone-500 leading-relaxed">설정 모순, 캐릭터 일관성, 시간선, 복선, 문체까지 병렬 분석.</p>
              </div>
            </div>

            <div className="flex gap-4 p-5 bg-white/60 dark:bg-stone-900/40 rounded-2xl border border-stone-200/60 dark:border-stone-800/40 card-hover">
              <div className="w-10 h-10 bg-stone-100 dark:bg-stone-800 rounded-xl flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5 text-stone-600 dark:text-stone-400" />
              </div>
              <div>
                <h3 className="font-medium mb-1 text-stone-700 dark:text-stone-300">AI 대필</h3>
                <p className="text-sm text-stone-400 dark:text-stone-500 leading-relaxed">아이디어만 주면 당신의 문체로 한 화를 작성. 웹툰 스크립트도 지원.</p>
              </div>
            </div>

            <div className="mt-8 p-5 bg-stone-100/50 dark:bg-stone-800/30 rounded-2xl border border-stone-200/40 dark:border-stone-700/30">
              <h4 className="font-medium mb-3 text-sm text-stone-600 dark:text-stone-400">무료 플랜 포함</h4>
              <ul className="space-y-2 text-sm text-stone-500 dark:text-stone-400">
                {['월 30회 AI 검수', '무제한 작품 & 챕터', 'StoryVault 자동 추출', '웹소설 & 웹툰 지원'].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Auth Form */}
          <div className="bg-white/60 dark:bg-stone-900/40 rounded-2xl border border-stone-200/60 dark:border-stone-800/40 p-8">
            <h2 className="font-serif text-xl font-medium mb-6 text-center text-stone-800 dark:text-stone-200">
              {isLogin ? '로그인' : '회원가입'}
            </h2>

            <button
              onClick={handleGoogleAuth}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-stone-200 dark:border-stone-700 rounded-xl hover:bg-stone-50 dark:hover:bg-stone-800 transition-all duration-300 text-stone-600 dark:text-stone-400 mb-6"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google로 계속하기
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="divider-subtle w-full" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-white dark:bg-stone-900 text-stone-400 dark:text-stone-500">또는</span>
              </div>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="이메일"
                  className="w-full px-4 py-3 border border-stone-200 dark:border-stone-700 rounded-xl bg-transparent focus:outline-none focus:border-stone-500 dark:focus:border-stone-500 transition-colors duration-300 text-stone-800 dark:text-stone-200 placeholder:text-stone-300 dark:placeholder:text-stone-600"
                  required
                />
              </div>
              <div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호 (6자 이상)"
                  className="w-full px-4 py-3 border border-stone-200 dark:border-stone-700 rounded-xl bg-transparent focus:outline-none focus:border-stone-500 dark:focus:border-stone-500 transition-colors duration-300 text-stone-800 dark:text-stone-200 placeholder:text-stone-300 dark:placeholder:text-stone-600"
                  required
                  minLength={6}
                />
              </div>

              {error && (
                <p className="text-red-500 text-sm">{error}</p>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3 px-4 border border-stone-800 dark:border-stone-300 text-stone-800 dark:text-stone-300 rounded-xl font-medium hover:bg-stone-800 hover:text-white dark:hover:bg-stone-300 dark:hover:text-stone-900 transition-all duration-300 disabled:opacity-50"
              >
                {authLoading ? '처리 중...' : isLogin ? '로그인' : '가입하기'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-stone-400 dark:text-stone-500">
              {isLogin ? '계정이 없으신가요? ' : '이미 계정이 있으신가요? '}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-stone-700 dark:text-stone-300 font-medium hover:underline underline-offset-2"
              >
                {isLogin ? '회원가입' : '로그인'}
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-stone-200/40 dark:border-stone-800/30 py-8 mt-16">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-stone-400 dark:text-stone-500">
          <p>&copy; 2024 StoryMind. Powered by Gemini AI.</p>
        </div>
      </footer>
    </div>
  )
}
