// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase/client'
import { useStore } from '@/stores/store'
import LifeHeader from '@/components/life/LifeHeader'
import StoryCard from '@/components/life/StoryCard'
import LifeOnboarding from '@/components/life/LifeOnboarding'
import MonthlyBest from '@/components/life/MonthlyBest'
import FeedTabs from '@/components/life/FeedTabs'
import GenreFilterChips from '@/components/life/GenreFilterChips'
import { PenLine, Sparkles, Loader2, BookOpen, ArrowRight } from 'lucide-react'

const DAILY_PROMPTS = [
  '오늘 길에서 마주친 낯선 사람의 이야기',
  '카페에서 엿들은 흥미로운 대화',
  '어제 꾸었던 이상한 꿈을 소설로',
  '비 오는 날의 특별한 기억',
  '첫사랑에게 보내지 못한 편지',
  '10년 후의 나에게 보내는 이야기',
  '오늘 먹은 음식에 담긴 추억',
]

export default function LifeFeedPage() {
  const router = useRouter()
  const { lifeFeed, fetchLifeFeed, lifeFeedHasMore, lifeFeedPage, lifeProfile, fetchLifeProfile, setUser, darkMode, toggleDark, requestRead } = useStore()
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [showProfileSetup, setShowProfileSetup] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [profileName, setProfileName] = useState('')
  const [profileBio, setProfileBio] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [feedTab, setFeedTab] = useState('all')
  const [selectedGenre, setSelectedGenre] = useState('')

  const todayPrompt = DAILY_PROMPTS[new Date().getDay()]

  useEffect(() => {
    const init = async () => {
      const supabase = getSupabase()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/')
        return
      }
      setUser({ id: session.user.id, email: session.user.email || '' })

      await fetchLifeProfile()
      await fetchLifeFeed(1)

      const savedDark = localStorage.getItem('sm_dark') === 'true'
      if (savedDark !== darkMode) toggleDark()

      setLoading(false)
    }
    init()
  }, [router])

  useEffect(() => {
    if (!loading && !lifeProfile) {
      setShowProfileSetup(true)
    }
  }, [loading, lifeProfile])

  const handleSaveProfile = async () => {
    if (!profileName.trim()) return
    setSavingProfile(true)
    const { updateLifeProfile } = useStore.getState()
    await updateLifeProfile({ display_name: profileName.trim(), bio: profileBio.trim() })
    setSavingProfile(false)
    setShowProfileSetup(false)

    const onboardingDone = localStorage.getItem('sl_onboarding_done')
    if (!onboardingDone) {
      setShowOnboarding(true)
    }
  }

  useEffect(() => {
    if (!loading && lifeProfile && !showProfileSetup) {
      const onboardingDone = localStorage.getItem('sl_onboarding_done')
      if (!onboardingDone) {
        setShowOnboarding(true)
      }
    }
  }, [loading, lifeProfile, showProfileSetup])

  useEffect(() => {
    if (!loading) {
      fetchLifeFeed(1, feedTab, selectedGenre)
    }
  }, [feedTab, selectedGenre])

  const handleLoadMore = async () => {
    setLoadingMore(true)
    await fetchLifeFeed(lifeFeedPage + 1, feedTab, selectedGenre)
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
      <LifeHeader onShowGuide={() => { localStorage.removeItem('sl_onboarding_done'); setShowOnboarding(true) }} />

      {/* Main content — generous spacing (benchmark: 1.5x) */}
      <main className="max-w-6xl mx-auto px-5 py-8 md:py-12">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Write CTA — prominent, top position */}
            <button
              onClick={() => router.push('/life/my')}
              className="w-full relative rounded-2xl p-6 md:p-7 mb-8 border border-stone-200/40 dark:border-stone-800/20 bg-white/40 dark:bg-stone-900/20 overflow-hidden text-left group hover:border-stone-300 dark:hover:border-stone-700 transition-all duration-500"
            >
              <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-stone-300/40 dark:via-stone-700/20 to-transparent" />
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-stone-100 dark:bg-stone-800/60 flex items-center justify-center shrink-0">
                  <PenLine className="w-5 h-5 text-stone-400 dark:text-stone-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-stone-600 dark:text-stone-300 mb-0.5">나만의 이야기 쓰기</p>
                  <p className="text-xs text-stone-400 dark:text-stone-500">오늘의 일상을 소설로 만들어보세요</p>
                </div>
                <ArrowRight className="w-4 h-4 text-stone-300 dark:text-stone-600 group-hover:text-stone-500 dark:group-hover:text-stone-400 group-hover:translate-x-0.5 transition-all duration-500" />
              </div>
            </button>

            {/* Daily prompt — subtle, not demanding */}
            <div className="relative rounded-2xl p-6 mb-8 border border-stone-200/30 dark:border-stone-800/15 bg-white/30 dark:bg-stone-900/15 overflow-hidden">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-stone-400 dark:text-stone-500" />
                <span className="text-[10px] font-medium tracking-[0.2em] uppercase text-stone-400 dark:text-stone-500">오늘의 글감</span>
              </div>
              <p className="font-serif text-sm text-stone-500 dark:text-stone-400 leading-relaxed">{todayPrompt}</p>
            </div>

            {/* Feed Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-serif text-xl font-medium text-stone-700 dark:text-stone-300 tracking-tight">
                이야기
              </h2>
            </div>

            {/* Tabs & Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-8">
              <FeedTabs
                active={feedTab}
                tabs={[
                  { key: 'all', label: '전체' },
                  { key: 'following', label: '팔로잉' },
                ]}
                onChange={setFeedTab}
              />
              <div className="sm:ml-auto">
                <GenreFilterChips selected={selectedGenre} onChange={setSelectedGenre} />
              </div>
            </div>

            {/* Feed Content — wider card gaps */}
            {lifeFeed.length === 0 ? (
              <div className="text-center py-20">
                <BookOpen className="w-8 h-8 text-stone-300 dark:text-stone-700 mx-auto mb-4" />
                <p className="text-sm text-stone-400 dark:text-stone-500">아직 공유된 이야기가 없습니다</p>
                <p className="text-xs text-stone-300 dark:text-stone-600 mt-1">위의 글쓰기 버튼으로 첫 이야기를 시작해보세요</p>
              </div>
            ) : (
              <div className="space-y-6 stagger-in">
                {lifeFeed.map((item) => (
                  <StoryCard key={item.id} item={item} onRequestRead={handleRequestRead} />
                ))}
                {lifeFeedHasMore && (
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="w-full py-3.5 text-sm text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 border border-stone-200/40 dark:border-stone-800/20 rounded-xl hover:border-stone-300 dark:hover:border-stone-700 transition-all duration-500 disabled:opacity-50"
                  >
                    {loadingMore ? (
                      <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                    ) : (
                      '더 보기'
                    )}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Sidebar (desktop) — more breathing room */}
          <div className="hidden lg:block w-72 shrink-0">
            <div className="sticky top-24 space-y-6">
              {/* My profile card */}
              {lifeProfile && (
                <div className="bg-white/40 dark:bg-stone-900/20 rounded-2xl border border-stone-200/40 dark:border-stone-800/20 p-6">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-full bg-stone-100 dark:bg-stone-800/80 flex items-center justify-center text-stone-500 dark:text-stone-400 font-serif font-medium text-lg ring-1 ring-stone-200/30 dark:ring-stone-700/20">
                      {lifeProfile.display_name?.charAt(0) || '?'}
                    </div>
                    <div>
                      <p className="font-medium text-sm text-stone-700 dark:text-stone-300">{lifeProfile.display_name}</p>
                      <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">스토리 {lifeProfile.total_stories}개</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Monthly Best */}
              <MonthlyBest />

              {/* Quick links to library */}
              <div className="bg-white/40 dark:bg-stone-900/20 rounded-2xl border border-stone-200/40 dark:border-stone-800/20 p-6">
                <h3 className="text-[11px] font-medium tracking-[0.2em] uppercase text-stone-400 dark:text-stone-500 mb-4">문학관</h3>
                <div className="space-y-1">
                  <button
                    onClick={() => router.push('/library?tab=short')}
                    className="w-full flex items-center gap-2.5 p-3 rounded-xl text-sm text-stone-500 dark:text-stone-400 hover:bg-stone-50/40 dark:hover:bg-stone-800/20 hover:text-stone-700 dark:hover:text-stone-300 transition-all duration-500"
                  >
                    <BookOpen className="w-4 h-4" />
                    단편 문학관
                  </button>
                  <button
                    onClick={() => router.push('/library?tab=long')}
                    className="w-full flex items-center gap-2.5 p-3 rounded-xl text-sm text-stone-500 dark:text-stone-400 hover:bg-stone-50/40 dark:hover:bg-stone-800/20 hover:text-stone-700 dark:hover:text-stone-300 transition-all duration-500"
                  >
                    <BookOpen className="w-4 h-4" />
                    장편 문학관
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Profile Setup Modal */}
      {showProfileSetup && (
        <div className="fixed inset-0 bg-black/30 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 modal-overlay">
          <div className="bg-white dark:bg-[#131211] rounded-2xl w-full max-w-md p-10 modal-content border border-stone-200/40 dark:border-stone-800/20">
            <h2 className="font-serif text-2xl font-medium mb-3 text-stone-800 dark:text-stone-200">StoryLife에 오신 걸 환영해요</h2>
            <p className="text-sm text-stone-400 dark:text-stone-500 mb-10">커뮤니티에서 사용할 프로필을 설정하세요</p>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2.5 text-stone-600 dark:text-stone-400">닉네임</label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="커뮤니티에서 사용할 이름"
                  className="w-full px-4 py-3.5 border border-stone-200/60 dark:border-stone-700/30 rounded-xl bg-transparent focus:outline-none focus:border-stone-400 dark:focus:border-stone-600 transition-colors duration-500 text-stone-800 dark:text-stone-200 placeholder:text-stone-300 dark:placeholder:text-stone-600"
                  autoFocus
                  maxLength={20}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2.5 text-stone-600 dark:text-stone-400">소개 (선택)</label>
                <textarea
                  value={profileBio}
                  onChange={(e) => setProfileBio(e.target.value)}
                  placeholder="나를 소개하는 한 줄"
                  className="w-full px-4 py-3.5 border border-stone-200/60 dark:border-stone-700/30 rounded-xl bg-transparent focus:outline-none focus:border-stone-400 dark:focus:border-stone-600 transition-colors duration-500 resize-none h-24 text-stone-800 dark:text-stone-200 placeholder:text-stone-300 dark:placeholder:text-stone-600"
                  maxLength={100}
                />
              </div>
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={!profileName.trim() || savingProfile}
              className="w-full mt-10 py-3.5 text-stone-600 dark:text-stone-300 border border-stone-300 dark:border-stone-700 rounded-xl font-medium hover:text-stone-800 dark:hover:text-stone-100 hover:border-stone-500 dark:hover:border-stone-500 transition-all duration-500 disabled:opacity-50"
            >
              {savingProfile ? '저장 중...' : '시작하기'}
            </button>
          </div>
        </div>
      )}

      {/* Onboarding Guide */}
      {showOnboarding && (
        <LifeOnboarding onClose={() => setShowOnboarding(false)} />
      )}
    </div>
  )
}
