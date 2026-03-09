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
import { PenLine, Sparkles, Loader2, BookOpen } from 'lucide-react'

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

      // Dark mode init
      const savedDark = localStorage.getItem('sm_dark') === 'true'
      if (savedDark !== darkMode) toggleDark()

      setLoading(false)
    }
    init()
  }, [router])

  // Check if profile needs setup
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

    // Show onboarding after profile setup
    const onboardingDone = localStorage.getItem('sl_onboarding_done')
    if (!onboardingDone) {
      setShowOnboarding(true)
    }
  }

  // Show onboarding on first visit (if profile already exists)
  useEffect(() => {
    if (!loading && lifeProfile && !showProfileSetup) {
      const onboardingDone = localStorage.getItem('sl_onboarding_done')
      if (!onboardingDone) {
        setShowOnboarding(true)
      }
    }
  }, [loading, lifeProfile, showProfileSetup])

  // Refetch when tab or genre changes
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
        <div className="w-6 h-6 border-2 border-rose-700 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <LifeHeader onShowGuide={() => { localStorage.removeItem('sl_onboarding_done'); setShowOnboarding(true) }} />

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Daily prompt */}
        <div className="relative rounded-2xl p-7 mb-8 border border-stone-200/60 dark:border-stone-800/40 bg-white/50 dark:bg-stone-900/30 overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-rose-300/60 dark:via-rose-700/40 to-transparent" />
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-rose-700 dark:text-rose-400" />
            <span className="text-xs font-medium tracking-widest uppercase text-rose-700/70 dark:text-rose-400/70">오늘의 글감</span>
          </div>
          <p className="font-serif text-lg text-stone-800 dark:text-stone-200 leading-relaxed">{todayPrompt}</p>
          <button
            onClick={() => router.push('/life/my')}
            className="mt-4 px-5 py-2 text-sm font-medium border border-rose-700 dark:border-rose-600 text-rose-700 dark:text-rose-400 rounded-full hover:bg-rose-700 hover:text-white dark:hover:bg-rose-700 dark:hover:text-white transition-all duration-300"
          >
            이 글감으로 쓰기
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Feed */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-xl font-medium text-stone-800 dark:text-stone-200">
                이야기
              </h2>
              <button
                onClick={() => router.push('/life/my')}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium border border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-400 rounded-lg hover:border-rose-700 hover:text-rose-700 dark:hover:border-rose-600 dark:hover:text-rose-400 transition-all duration-300"
              >
                <PenLine className="w-4 h-4" />
                글쓰기
              </button>
            </div>

            <FeedTabs
              active={feedTab}
              tabs={[
                { key: 'all', label: '전체' },
                { key: 'following', label: '팔로잉' },
              ]}
              onChange={setFeedTab}
            />
            <div className="mt-4 mb-6">
              <GenreFilterChips selected={selectedGenre} onChange={setSelectedGenre} />
            </div>

            {lifeFeed.length === 0 ? (
              <div className="text-center py-20">
                <BookOpen className="w-10 h-10 text-stone-300 dark:text-stone-700 mx-auto mb-4" />
                <p className="font-serif text-stone-400 dark:text-stone-500 mb-6">아직 이야기가 없습니다</p>
                <button
                  onClick={() => router.push('/life/my')}
                  className="px-6 py-2.5 text-sm font-medium border border-rose-700 dark:border-rose-600 text-rose-700 dark:text-rose-400 rounded-xl hover:bg-rose-700 hover:text-white dark:hover:bg-rose-700 dark:hover:text-white transition-all duration-300"
                >
                  첫 이야기 쓰기
                </button>
              </div>
            ) : (
              <div className="space-y-5 stagger-in">
                {lifeFeed.map((item) => (
                  <StoryCard key={item.id} item={item} onRequestRead={handleRequestRead} />
                ))}
                {lifeFeedHasMore && (
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="w-full py-3 text-sm text-stone-400 hover:text-rose-700 dark:hover:text-rose-400 border border-stone-200/60 dark:border-stone-800/40 rounded-xl hover:border-rose-300 dark:hover:border-rose-800 transition-all duration-300 disabled:opacity-50"
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

          {/* Sidebar (desktop) */}
          <div className="hidden lg:block w-72 shrink-0">
            <div className="sticky top-20 space-y-5">
              {/* Monthly Best */}
              <MonthlyBest />

              {/* My profile card */}
              {lifeProfile && (
                <div className="bg-white/60 dark:bg-stone-900/40 rounded-2xl border border-stone-200/60 dark:border-stone-800/40 p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-600 dark:text-stone-400 font-serif font-medium text-lg ring-1 ring-stone-200/60 dark:ring-stone-700/60">
                      {lifeProfile.display_name?.charAt(0) || '?'}
                    </div>
                    <div>
                      <p className="font-medium text-sm text-stone-700 dark:text-stone-300">{lifeProfile.display_name}</p>
                      <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">스토리 {lifeProfile.total_stories}개</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Profile Setup Modal */}
      {showProfileSetup && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 modal-overlay">
          <div className="bg-white dark:bg-stone-900 rounded-2xl w-full max-w-md p-8 modal-content border border-stone-200/60 dark:border-stone-800/60">
            <h2 className="font-serif text-2xl font-medium mb-2 text-stone-800 dark:text-stone-200">StoryLife에 오신 걸 환영해요</h2>
            <p className="text-sm text-stone-400 dark:text-stone-500 mb-8">커뮤니티에서 사용할 프로필을 설정하세요</p>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-2 text-stone-600 dark:text-stone-400">닉네임</label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="커뮤니티에서 사용할 이름"
                  className="w-full px-4 py-3 border border-stone-200 dark:border-stone-700 rounded-xl bg-transparent focus:outline-none focus:border-rose-700 dark:focus:border-rose-600 transition-colors duration-300 text-stone-800 dark:text-stone-200 placeholder:text-stone-300 dark:placeholder:text-stone-600"
                  autoFocus
                  maxLength={20}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-stone-600 dark:text-stone-400">소개 (선택)</label>
                <textarea
                  value={profileBio}
                  onChange={(e) => setProfileBio(e.target.value)}
                  placeholder="나를 소개하는 한 줄"
                  className="w-full px-4 py-3 border border-stone-200 dark:border-stone-700 rounded-xl bg-transparent focus:outline-none focus:border-rose-700 dark:focus:border-rose-600 transition-colors duration-300 resize-none h-20 text-stone-800 dark:text-stone-200 placeholder:text-stone-300 dark:placeholder:text-stone-600"
                  maxLength={100}
                />
              </div>
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={!profileName.trim() || savingProfile}
              className="w-full mt-8 py-3 border border-rose-700 dark:border-rose-600 text-rose-700 dark:text-rose-400 rounded-xl font-medium hover:bg-rose-700 hover:text-white dark:hover:bg-rose-700 dark:hover:text-white transition-all duration-300 disabled:opacity-50"
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
