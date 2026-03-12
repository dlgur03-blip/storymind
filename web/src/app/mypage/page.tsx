// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase/client'
import { useStore } from '@/stores/store'
import {
  ArrowLeft, Coins, BookOpen, Heart, Pencil, Settings, ChevronRight,
  FileText, MessageSquare, Gift, Star, TrendingUp, Calendar, Shield
} from 'lucide-react'

export default function MyPage() {
  const router = useRouter()
  const { darkMode } = useStore()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [credits, setCredits] = useState(0)
  const [dailyClaimed, setDailyClaimed] = useState(false)
  const [stats, setStats] = useState({
    totalWorks: 0,
    totalChapters: 0,
    totalStories: 0,
    totalStoryChapters: 0,
  })
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const init = async () => {
      const supabase = getSupabase()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/'); return }
      setUser(session.user)
      setIsAdmin(session.user.email === 'dlgur03@gmail.com')

      // Fetch profile
      const { data: profileData } = await supabase
        .from('life_profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .single()
      setProfile(profileData)

      // Fetch credits
      try {
        const creditsRes = await fetch('/api/credits')
        if (creditsRes.ok) {
          const creditsData = await creditsRes.json()
          setCredits(creditsData.balance)
          // Check if daily was already claimed by looking at transactions
          const todayStr = new Date().toISOString().split('T')[0]
          const hasDailyClaim = (creditsData.transactions || []).some(
            (t: any) => t.type === 'daily_free' && t.created_at?.startsWith(todayStr)
          )
          setDailyClaimed(hasDailyClaim)
        }
      } catch {}

      // Fetch StoryMind stats
      const { count: worksCount } = await supabase
        .from('works')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id)
      const { count: chaptersCount } = await supabase
        .from('chapters')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id)

      // Fetch StoryLife stats
      const { count: storiesCount } = await supabase
        .from('life_stories')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id)
      const { count: storyChaptersCount } = await supabase
        .from('life_chapters')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id)

      setStats({
        totalWorks: worksCount || 0,
        totalChapters: chaptersCount || 0,
        totalStories: storiesCount || 0,
        totalStoryChapters: storyChaptersCount || 0,
      })

      setLoading(false)
    }
    init()
  }, [router])

  const handleClaimDaily = async () => {
    const res = await fetch('/api/credits/daily', { method: 'POST' })
    if (res.ok) {
      const data = await res.json()
      setCredits(data.balance)
      setDailyClaimed(true)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="w-6 h-6 border-2 border-stone-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const menuItems = [
    { icon: Coins, label: '크레딧 충전', href: '/credits', accent: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    { icon: BookOpen, label: 'Story Mind 대시보드', href: '/dashboard', accent: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    { icon: Heart, label: 'Story Life', href: '/life', accent: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-900/20' },
    { icon: Pencil, label: 'Story Editor', href: '/editor-mode', accent: 'text-stone-600 dark:text-stone-400', bg: 'bg-stone-100 dark:bg-stone-800/30' },
    { icon: Settings, label: '설정', href: '/settings', accent: 'text-stone-600 dark:text-stone-400', bg: 'bg-stone-100 dark:bg-stone-800/30' },
  ]

  if (isAdmin) {
    menuItems.push({ icon: Shield, label: '관리자', href: '/admin', accent: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/20' })
  }

  const joinDate = user?.created_at ? new Date(user.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }) : ''

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="border-b border-stone-200/60 dark:border-stone-800/60 bg-white/50 dark:bg-stone-900/50 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => router.push('/home')} className="p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-stone-600 dark:text-stone-400" />
          </button>
          <h1 className="font-serif text-xl font-medium text-stone-800 dark:text-stone-200">마이페이지</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Profile Card */}
        <div className="bg-gradient-to-br from-stone-800 to-stone-900 dark:from-stone-700 dark:to-stone-800 rounded-2xl p-6 text-white">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-2xl font-serif">
              {(profile?.display_name || user?.email || '?')[0].toUpperCase()}
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-medium">{profile?.display_name || '사용자'}</h2>
              <p className="text-sm text-stone-400">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-stone-400">
            <Calendar className="w-4 h-4" />
            {joinDate} 가입
          </div>
        </div>

        {/* Credit Card */}
        <div className="bg-white/60 dark:bg-stone-900/40 rounded-2xl border border-stone-200/60 dark:border-stone-800/40 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-amber-500" />
              <span className="font-medium text-stone-700 dark:text-stone-300">크레딧</span>
            </div>
            <button
              onClick={() => router.push('/credits')}
              className="text-sm text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 flex items-center gap-1 transition-colors"
            >
              충전하기 <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-3xl font-bold text-stone-800 dark:text-stone-200">{credits.toLocaleString()}</span>
            {!dailyClaimed && (
              <button
                onClick={handleClaimDaily}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-lg text-sm font-medium hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors"
              >
                <Gift className="w-4 h-4" />
                무료 3개 받기
              </button>
            )}
            {dailyClaimed && (
              <span className="text-sm text-stone-400 flex items-center gap-1">
                <Star className="w-4 h-4 text-amber-400" /> 오늘 수령 완료
              </span>
            )}
          </div>
        </div>

        {/* Activity Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/60 dark:bg-stone-900/40 rounded-2xl border border-stone-200/60 dark:border-stone-800/40 p-5">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="text-sm font-medium text-stone-500 dark:text-stone-400">Story Mind</span>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-stone-500 dark:text-stone-400">작품</span>
                <span className="text-lg font-bold text-stone-800 dark:text-stone-200">{stats.totalWorks}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-stone-500 dark:text-stone-400">챕터</span>
                <span className="text-lg font-bold text-stone-800 dark:text-stone-200">{stats.totalChapters}</span>
              </div>
            </div>
          </div>

          <div className="bg-white/60 dark:bg-stone-900/40 rounded-2xl border border-stone-200/60 dark:border-stone-800/40 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Heart className="w-4 h-4 text-rose-500 dark:text-rose-400" />
              <span className="text-sm font-medium text-stone-500 dark:text-stone-400">Story Life</span>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-stone-500 dark:text-stone-400">이야기</span>
                <span className="text-lg font-bold text-stone-800 dark:text-stone-200">{stats.totalStories}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-stone-500 dark:text-stone-400">챕터</span>
                <span className="text-lg font-bold text-stone-800 dark:text-stone-200">{stats.totalStoryChapters}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Menu List */}
        <div className="bg-white/60 dark:bg-stone-900/40 rounded-2xl border border-stone-200/60 dark:border-stone-800/40 overflow-hidden">
          {menuItems.map((item, i) => {
            const Icon = item.icon
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={`w-full flex items-center gap-4 px-5 py-4 hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors text-left ${
                  i > 0 ? 'border-t border-stone-200/40 dark:border-stone-800/30' : ''
                }`}
              >
                <div className={`w-9 h-9 ${item.bg} rounded-xl flex items-center justify-center`}>
                  <Icon className={`w-[18px] h-[18px] ${item.accent}`} />
                </div>
                <span className="flex-1 font-medium text-stone-700 dark:text-stone-300">{item.label}</span>
                <ChevronRight className="w-4 h-4 text-stone-400" />
              </button>
            )
          })}
        </div>
      </main>
    </div>
  )
}
