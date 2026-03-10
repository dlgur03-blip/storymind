// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase/client'
import { BookOpen, Heart, Pencil, Library, ArrowRight, Moon, Sun } from 'lucide-react'

export default function Home() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLogin, setIsLogin] = useState(true)
  const [error, setError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    // Sync dark mode state with DOM
    setIsDark(document.documentElement.classList.contains('dark'))
  }, [])

  const toggleDark = () => {
    const next = !isDark
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('sm_dark', String(next))
    setIsDark(next)
  }

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

  const services = [
    {
      icon: Heart,
      name: 'Story Life',
      desc: 'AI와 대화하며 일상을 소설로',
    },
    {
      icon: BookOpen,
      name: 'Story Mind',
      desc: 'AI와 함께 웹소설·웹툰 창작',
    },
    {
      icon: Pencil,
      name: 'Story Editor',
      desc: '원고 편집과 피드백',
    },
    {
      icon: Library,
      name: '문학관',
      desc: '단편·장편 이야기 감상',
    },
  ]

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col">
      {/* Dark mode toggle — top right */}
      <div className="fixed top-5 right-5 z-50">
        <button
          onClick={toggleDark}
          className="p-2.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 rounded-xl transition-all duration-500"
          aria-label="다크 모드 전환"
        >
          {isDark ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-16 md:py-20">
        {/* Hero */}
        <div className="text-center mb-12 md:mb-16 home-hero-fade">
          <p className="text-[11px] tracking-[0.25em] uppercase text-stone-400 dark:text-stone-400 mb-4">
            개개인의 이야기가 특별한 세상
          </p>
          <h1 className="font-serif text-4xl md:text-5xl font-medium tracking-tight text-stone-800 dark:text-stone-200 mb-5">
            StoryMind
          </h1>
          <p className="text-base md:text-lg text-stone-400 dark:text-stone-400 tracking-wide">
            여러분의 일기가 소설이 됩니다
          </p>
        </div>

        {/* Auth Card — centered, clean */}
        <div className="w-full max-w-sm mb-16 stagger-in">
          <div className="bg-white/50 dark:bg-stone-800/40 rounded-2xl border border-stone-200/40 dark:border-stone-700/40 p-8 md:p-10">
            <h2 className="font-serif text-lg font-medium mb-8 text-center text-stone-700 dark:text-stone-300">
              {isLogin ? '로그인' : '회원가입'}
            </h2>

            <button
              onClick={handleGoogleAuth}
              className="w-full flex items-center justify-center gap-2.5 py-3 px-4 border border-stone-200/60 dark:border-stone-700/30 rounded-xl hover:border-stone-300 dark:hover:border-stone-600 transition-all duration-500 text-stone-600 dark:text-stone-400 mb-6"
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
              <div className="relative flex justify-center text-[11px]">
                <span className="px-3 bg-white dark:bg-[#0a0908] text-stone-400 dark:text-stone-400 tracking-wider">또는</span>
              </div>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="이메일"
                className="w-full px-4 py-3 border border-stone-200/60 dark:border-stone-700/30 rounded-xl bg-transparent focus:outline-none focus:border-stone-400 dark:focus:border-stone-600 transition-colors duration-500 text-stone-800 dark:text-stone-200 placeholder:text-stone-300 dark:placeholder:text-stone-500"
                required
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호 (6자 이상)"
                className="w-full px-4 py-3 border border-stone-200/60 dark:border-stone-700/30 rounded-xl bg-transparent focus:outline-none focus:border-stone-400 dark:focus:border-stone-600 transition-colors duration-500 text-stone-800 dark:text-stone-200 placeholder:text-stone-300 dark:placeholder:text-stone-500"
                required
                minLength={6}
              />

              {error && (
                <p className="text-red-500 dark:text-red-400 text-sm">{error}</p>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3 text-stone-600 dark:text-stone-300 border border-stone-300 dark:border-stone-700 rounded-xl font-medium hover:text-stone-800 dark:hover:text-stone-100 hover:border-stone-500 dark:hover:border-stone-500 transition-all duration-500 disabled:opacity-50"
              >
                {authLoading ? '처리 중...' : isLogin ? '로그인' : '가입하기'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-stone-400 dark:text-stone-400">
              {isLogin ? '계정이 없으신가요? ' : '이미 계정이 있으신가요? '}
              <button
                onClick={() => { setIsLogin(!isLogin); setError('') }}
                className="text-stone-600 dark:text-stone-300 font-medium hover:underline underline-offset-4 transition-colors duration-500"
              >
                {isLogin ? '회원가입' : '로그인'}
              </button>
            </p>
          </div>
        </div>

        {/* Services — horizontal, subtle */}
        <div className="w-full max-w-3xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 stagger-in">
            {services.map((s) => {
              const Icon = s.icon
              return (
                <div
                  key={s.name}
                  className="text-center p-5 md:p-6 rounded-2xl border border-stone-200/30 dark:border-stone-700/35 bg-white/30 dark:bg-stone-800/30"
                >
                  <Icon className="w-5 h-5 text-stone-400 dark:text-stone-400 mx-auto mb-3" />
                  <p className="text-sm font-medium text-stone-600 dark:text-stone-400 mb-1">{s.name}</p>
                  <p className="text-[11px] text-stone-400 dark:text-stone-400 leading-relaxed">{s.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-8">
        <p className="text-center text-[11px] text-stone-300 dark:text-stone-400 tracking-[0.15em]">
          &copy; 2025 StoryMind
        </p>
      </footer>
    </div>
  )
}
