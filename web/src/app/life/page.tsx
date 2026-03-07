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
import { PenLine, TrendingUp, Sparkles, Loader2, BookOpen } from 'lucide-react'

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

  const handleLoadMore = async () => {
    setLoadingMore(true)
    await fetchLifeFeed(lifeFeedPage + 1)
    setLoadingMore(false)
  }

  const handleRequestRead = async (storyId: string) => {
    return await requestRead(storyId)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <LifeHeader />

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Daily prompt */}
        <div className="bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/30 rounded-2xl p-5 mb-6 border border-rose-100 dark:border-rose-900/30">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-rose-500" />
            <span className="text-sm font-medium text-rose-600 dark:text-rose-400">오늘의 글감</span>
          </div>
          <p className="text-neutral-800 dark:text-neutral-200 font-medium">{todayPrompt}</p>
          <button
            onClick={() => router.push('/life/my')}
            className="mt-3 px-4 py-1.5 bg-rose-500 text-white text-sm rounded-full hover:bg-rose-600 transition"
          >
            이 글감으로 쓰기
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Feed */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-rose-500" />
                최신 이야기
              </h2>
              <button
                onClick={() => router.push('/life/my')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500 text-white text-sm rounded-lg hover:bg-rose-600 transition"
              >
                <PenLine className="w-4 h-4" />
                글쓰기
              </button>
            </div>

            {lifeFeed.length === 0 ? (
              <div className="text-center py-16">
                <BookOpen className="w-12 h-12 text-neutral-300 dark:text-neutral-700 mx-auto mb-3" />
                <p className="text-neutral-400 mb-4">아직 이야기가 없습니다</p>
                <button
                  onClick={() => router.push('/life/my')}
                  className="px-6 py-2 bg-rose-500 text-white rounded-xl hover:bg-rose-600 transition"
                >
                  첫 이야기 쓰기
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {lifeFeed.map((item) => (
                  <StoryCard key={item.id} item={item} onRequestRead={handleRequestRead} />
                ))}
                {lifeFeedHasMore && (
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="w-full py-3 text-sm text-neutral-500 hover:text-rose-500 border border-neutral-200 dark:border-neutral-700 rounded-xl hover:border-rose-300 transition disabled:opacity-50"
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
            <div className="sticky top-20 space-y-4">
              {/* Monthly Best */}
              <MonthlyBest />

              {/* My profile card */}
              {lifeProfile && (
                <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center text-rose-600 dark:text-rose-400 font-medium">
                      {lifeProfile.display_name?.charAt(0) || '?'}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{lifeProfile.display_name}</p>
                      <p className="text-xs text-neutral-400">스토리 {lifeProfile.total_stories}개</p>
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-neutral-800 rounded-2xl w-full max-w-md p-6 life-fade-in">
            <h2 className="text-xl font-bold mb-2">StoryLife에 오신 걸 환영해요!</h2>
            <p className="text-sm text-neutral-500 mb-6">커뮤니티에서 사용할 프로필을 설정하세요</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">닉네임</label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="커뮤니티에서 사용할 이름"
                  className="w-full px-4 py-3 border border-neutral-200 dark:border-neutral-700 rounded-xl bg-transparent focus:outline-none focus:ring-2 focus:ring-rose-500"
                  autoFocus
                  maxLength={20}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">소개 (선택)</label>
                <textarea
                  value={profileBio}
                  onChange={(e) => setProfileBio(e.target.value)}
                  placeholder="나를 소개하는 한 줄"
                  className="w-full px-4 py-3 border border-neutral-200 dark:border-neutral-700 rounded-xl bg-transparent focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none h-20"
                  maxLength={100}
                />
              </div>
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={!profileName.trim() || savingProfile}
              className="w-full mt-6 py-3 bg-rose-500 text-white rounded-xl font-medium hover:bg-rose-600 transition disabled:opacity-50"
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
