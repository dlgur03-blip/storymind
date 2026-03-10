// @ts-nocheck
'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getSupabase } from '@/lib/supabase/client'
import { useStore } from '@/stores/store'
import StoryCard from '@/components/life/StoryCard'
import GenreFilterChips from '@/components/life/GenreFilterChips'
import {
  BookMarked, Library, ArrowLeft, Loader2, BookOpen,
  Moon, Sun, TrendingUp, Clock
} from 'lucide-react'

export default function LibraryPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="w-6 h-6 border-2 border-stone-400 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <LibraryContent />
    </Suspense>
  )
}

function LibraryContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { setUser, darkMode, toggleDark, requestRead } = useStore()

  const [loading, setLoading] = useState(true)
  const [stories, setStories] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'short' | 'long'>(
    (searchParams.get('tab') as 'short' | 'long') || 'short'
  )
  const [selectedGenre, setSelectedGenre] = useState('')
  const [sortBy, setSortBy] = useState<'recent' | 'trending'>('recent')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

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

  const fetchStories = async (pageNum: number, append = false) => {
    try {
      const params = new URLSearchParams({
        page: String(pageNum),
        limit: '20',
        sort: sortBy,
        series_type: activeTab,
      })
      if (selectedGenre) params.set('genre', selectedGenre)

      const res = await fetch(`/api/life/feed?${params}`)
      const data = await res.json()

      if (append) {
        setStories(prev => [...prev, ...(data.feed || [])])
      } else {
        setStories(data.feed || [])
      }
      setHasMore(data.hasMore || false)
      setPage(pageNum)
    } catch {
      if (!append) setStories([])
    }
  }

  useEffect(() => {
    if (!loading) {
      fetchStories(1)
    }
  }, [loading, activeTab, selectedGenre, sortBy])

  const handleTabChange = (tab: 'short' | 'long') => {
    setActiveTab(tab)
    router.replace(`/library?tab=${tab}`, { scroll: false })
  }

  const handleLoadMore = async () => {
    setLoadingMore(true)
    await fetchStories(page + 1, true)
    setLoadingMore(false)
  }

  const handleRequestRead = async (storyId: string) => {
    return await requestRead(storyId)
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
      {/* Header */}
      <header className="bg-white/80 dark:bg-stone-900/80 backdrop-blur-md border-b border-stone-200/60 dark:border-stone-800/60 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/home')}
              className="p-1.5 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors duration-300"
            >
              <ArrowLeft className="w-5 h-5 text-stone-500 dark:text-stone-400" />
            </button>
            <h1 className="font-serif text-lg font-medium text-stone-800 dark:text-stone-200">문학관</h1>
          </div>
          <button
            onClick={toggleDark}
            className="p-2 text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-100/60 dark:hover:bg-stone-800/40 rounded-lg transition-all duration-300"
          >
            {darkMode ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => handleTabChange('short')}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium text-sm transition-all duration-300 ${
              activeTab === 'short'
                ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400 border border-violet-200/80 dark:border-violet-800/40 shadow-sm'
                : 'bg-white/60 dark:bg-stone-900/40 text-stone-500 dark:text-stone-400 border border-stone-200/60 dark:border-stone-800/40 hover:border-violet-200 dark:hover:border-violet-800'
            }`}
          >
            <BookMarked className="w-4 h-4" />
            단편 문학관
          </button>
          <button
            onClick={() => handleTabChange('long')}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium text-sm transition-all duration-300 ${
              activeTab === 'long'
                ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-800/40 shadow-sm'
                : 'bg-white/60 dark:bg-stone-900/40 text-stone-500 dark:text-stone-400 border border-stone-200/60 dark:border-stone-800/40 hover:border-indigo-200 dark:hover:border-indigo-800'
            }`}
          >
            <Library className="w-4 h-4" />
            장편 문학관
          </button>
        </div>

        {/* Description */}
        <div className="mb-6">
          <p className="text-sm text-stone-500 dark:text-stone-400">
            {activeTab === 'short'
              ? '완결된 짧은 이야기들을 감상하세요. 한 편의 단편소설처럼 완성된 작품들입니다.'
              : '연재 중인 장편 이야기들을 만나보세요. 매 화마다 새로운 전개가 기다립니다.'}
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
          <div className="flex-1">
            <GenreFilterChips selected={selectedGenre} onChange={setSelectedGenre} />
          </div>
          <div className="flex gap-1.5 shrink-0">
            <button
              onClick={() => setSortBy('recent')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 ${
                sortBy === 'recent'
                  ? 'bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-900'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
              }`}
            >
              <Clock className="w-3 h-3" />
              최신
            </button>
            <button
              onClick={() => setSortBy('trending')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 ${
                sortBy === 'trending'
                  ? 'bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-900'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
              }`}
            >
              <TrendingUp className="w-3 h-3" />
              인기
            </button>
          </div>
        </div>

        {/* Stories */}
        {stories.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="w-10 h-10 text-stone-300 dark:text-stone-700 mx-auto mb-4" />
            <p className="font-serif text-stone-400 dark:text-stone-500 mb-2">
              {activeTab === 'short' ? '단편 문학관' : '장편 문학관'}에 아직 작품이 없습니다
            </p>
            <p className="text-sm text-stone-400 dark:text-stone-500">
              StoryLife에서 이야기를 작성하고 발행해보세요
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 stagger-in">
            {stories.map((item) => (
              <StoryCard key={item.id} item={item} onRequestRead={handleRequestRead} />
            ))}
          </div>
        )}

        {/* Load More */}
        {hasMore && (
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="w-full mt-6 py-3 text-sm text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 border border-stone-200/60 dark:border-stone-800/40 rounded-xl hover:border-stone-300 dark:hover:border-stone-700 transition-all duration-300 disabled:opacity-50"
          >
            {loadingMore ? (
              <Loader2 className="w-4 h-4 animate-spin mx-auto" />
            ) : (
              '더 보기'
            )}
          </button>
        )}
      </main>
    </div>
  )
}
