// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase/client'
import { useStore } from '@/stores/store'
import { BookOpen, Heart, Pencil, Moon, Sun, LogOut, ArrowRight } from 'lucide-react'

export default function HomePage() {
  const router = useRouter()
  const { darkMode, toggleDark, setUser } = useStore()
  const [loading, setLoading] = useState(true)
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      const supabase = getSupabase()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/'); return }
      setUser({ id: session.user.id, email: session.user.email || '' })

      const savedDark = localStorage.getItem('sm_dark') === 'true'
      if (savedDark !== darkMode) toggleDark()

      setLoading(false)
    }
    init()
  }, [router])

  const handleLogout = async () => {
    const supabase = getSupabase()
    await supabase.auth.signOut()
    router.push('/')
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
      id: 'mind',
      name: 'Mind',
      label: 'Story Mind',
      description: '작품을 창작하세요',
      detail: 'AI와 함께 웹소설·웹툰을 쓰고,\nStoryVault가 설정을 기억합니다.',
      icon: BookOpen,
      href: '/dashboard',
      gradient: 'from-amber-50/80 via-stone-50/60 to-orange-50/40',
      gradientDark: 'dark:from-amber-950/30 dark:via-stone-950/20 dark:to-orange-950/20',
      accent: 'text-amber-800 dark:text-amber-300',
      accentBg: 'bg-amber-100 dark:bg-amber-900/30',
      accentBorder: 'border-amber-200/80 dark:border-amber-800/40',
      hoverShadow: 'hover:shadow-amber-200/30 dark:hover:shadow-amber-900/20',
      orb: 'bg-amber-200/40 dark:bg-amber-800/20',
    },
    {
      id: 'life',
      name: 'Life',
      label: 'Story Life',
      description: '일상을 소설로 만드세요',
      detail: 'AI 친구에게 하루를 이야기하면\n당신만의 소설이 탄생합니다.',
      icon: Heart,
      href: '/life',
      gradient: 'from-rose-50/80 via-pink-50/40 to-stone-50/60',
      gradientDark: 'dark:from-rose-950/30 dark:via-pink-950/20 dark:to-stone-950/20',
      accent: 'text-rose-700 dark:text-rose-400',
      accentBg: 'bg-rose-100 dark:bg-rose-900/30',
      accentBorder: 'border-rose-200/80 dark:border-rose-800/40',
      hoverShadow: 'hover:shadow-rose-200/30 dark:hover:shadow-rose-900/20',
      orb: 'bg-rose-200/40 dark:bg-rose-800/20',
    },
    {
      id: 'editor',
      name: 'Editor',
      label: 'Story Editor',
      description: '원고를 관리하세요',
      detail: '작가의 원고에 코멘트를 달고\n편집 피드백을 주고받으세요.',
      icon: Pencil,
      href: '/editor-mode',
      gradient: 'from-stone-100/80 via-slate-50/40 to-zinc-50/60',
      gradientDark: 'dark:from-stone-900/40 dark:via-slate-950/20 dark:to-zinc-950/20',
      accent: 'text-stone-700 dark:text-stone-300',
      accentBg: 'bg-stone-200 dark:bg-stone-800/50',
      accentBorder: 'border-stone-300/80 dark:border-stone-700/40',
      hoverShadow: 'hover:shadow-stone-300/30 dark:hover:shadow-stone-800/20',
      orb: 'bg-stone-200/50 dark:bg-stone-700/30',
    },
  ]

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col">
      {/* Minimal header */}
      <header className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-between">
        <h1 className="font-serif text-lg font-medium text-stone-800 dark:text-stone-200 tracking-tight">
          Story
        </h1>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleDark}
            className="p-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 rounded-lg hover:bg-white/60 dark:hover:bg-stone-800/40 transition-all duration-300"
          >
            {darkMode ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
          </button>
          <button
            onClick={handleLogout}
            className="p-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 rounded-lg hover:bg-white/60 dark:hover:bg-stone-800/40 transition-all duration-300"
          >
            <LogOut className="w-[18px] h-[18px]" />
          </button>
        </div>
      </header>

      {/* Hero area */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 pt-20 pb-8">
        {/* Title */}
        <div className="text-center mb-12 home-hero-fade">
          <p className="text-sm tracking-[0.3em] uppercase text-stone-400 dark:text-stone-500 mb-3 font-medium">
            당신의 이야기를 시작하세요
          </p>
          <h2 className="font-serif text-4xl md:text-5xl font-medium text-stone-800 dark:text-stone-200 tracking-tight">
            Story
          </h2>
        </div>

        {/* 3-Card Grid */}
        <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6 stagger-in">
          {services.map((service) => {
            const Icon = service.icon
            const isHovered = hoveredCard === service.id

            return (
              <button
                key={service.id}
                onClick={() => router.push(service.href)}
                onMouseEnter={() => setHoveredCard(service.id)}
                onMouseLeave={() => setHoveredCard(null)}
                className={`
                  relative group text-left rounded-3xl border p-8 md:p-10
                  bg-gradient-to-br ${service.gradient} ${service.gradientDark}
                  ${service.accentBorder}
                  transition-all duration-500 ease-[var(--ease-premium)]
                  hover:shadow-2xl ${service.hoverShadow}
                  hover:-translate-y-1
                  overflow-hidden
                  min-h-[260px] md:min-h-[340px]
                  flex flex-col justify-between
                `}
              >
                {/* Decorative orb */}
                <div className={`
                  absolute -top-16 -right-16 w-48 h-48 rounded-full ${service.orb}
                  blur-3xl transition-all duration-700
                  ${isHovered ? 'opacity-80 scale-110' : 'opacity-40 scale-100'}
                `} />
                <div className={`
                  absolute -bottom-20 -left-20 w-40 h-40 rounded-full ${service.orb}
                  blur-3xl transition-all duration-700
                  ${isHovered ? 'opacity-60 scale-110' : 'opacity-20 scale-100'}
                `} />

                {/* Content */}
                <div className="relative z-10">
                  <div className={`w-14 h-14 ${service.accentBg} rounded-2xl flex items-center justify-center mb-6 transition-transform duration-500 ${isHovered ? 'scale-110' : ''}`}>
                    <Icon className={`w-7 h-7 ${service.accent}`} />
                  </div>
                  <div className="mb-2">
                    <span className={`text-xs font-medium tracking-widest uppercase ${service.accent} opacity-70`}>
                      {service.label}
                    </span>
                  </div>
                  <h3 className="font-serif text-2xl font-medium text-stone-800 dark:text-stone-200 mb-2">
                    {service.description}
                  </h3>
                  <p className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed whitespace-pre-line">
                    {service.detail}
                  </p>
                </div>

                {/* Arrow */}
                <div className={`
                  relative z-10 flex items-center gap-1.5 mt-6
                  text-sm font-medium ${service.accent}
                  transition-all duration-300
                  ${isHovered ? 'translate-x-1 opacity-100' : 'opacity-60'}
                `}>
                  시작하기
                  <ArrowRight className={`w-4 h-4 transition-transform duration-300 ${isHovered ? 'translate-x-1' : ''}`} />
                </div>
              </button>
            )
          })}
        </div>

        {/* Subtle footer text */}
        <p className="mt-12 text-xs text-stone-400 dark:text-stone-600 tracking-wide">
          Powered by Gemini AI
        </p>
      </div>
    </div>
  )
}
