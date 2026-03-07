// @ts-nocheck
'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase/client'
import LifeHeader from '@/components/life/LifeHeader'
import FollowButton from '@/components/life/FollowButton'
import {
  BookOpen, Heart, Users, Eye, Clock, Flame, Trophy, Calendar
} from 'lucide-react'

export default function PublicProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [stories, setStories] = useState<any[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'stories' | 'liked'>('stories')
  const [streak, setStreak] = useState<any>(null)
  const [badges, setBadges] = useState<any[]>([])

  useEffect(() => {
    const init = async () => {
      const supabase = getSupabase()
      const { data: { session } } = await supabase.auth.getSession()
      if (session) setCurrentUserId(session.user.id)

      const res = await fetch(`/api/life/profile/${userId}`)
      const data = await res.json()
      if (!data.profile) {
        router.push('/life')
        return
      }
      setProfile(data.profile)
      setStories(data.stories || [])

      // Fetch streak and badges for this user
      try {
        const [streakRes, badgesRes] = await Promise.all([
          fetch('/api/life/streaks'),
          fetch(`/api/life/badges?userId=${userId}`),
        ])
        const streakData = await streakRes.json()
        const badgesData = await badgesRes.json()

        // Only show own streak
        if (session?.user.id === userId) {
          setStreak(streakData.streak)
        }
        setBadges(badgesData.badges || [])
      } catch {}

      const savedDark = localStorage.getItem('sm_dark') === 'true'
      if (savedDark) document.documentElement.classList.add('dark')

      setLoading(false)
    }
    init()
  }, [userId, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!profile) return null

  const isOwnProfile = currentUserId === userId

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <LifeHeader />

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Profile header */}
        <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 p-6 mb-6 life-fade-in">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center text-2xl font-bold text-rose-600 dark:text-rose-400">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-16 h-16 rounded-full object-cover" />
              ) : (
                profile.display_name?.charAt(0) || '?'
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold">{profile.display_name}</h1>
              {profile.bio && (
                <p className="text-sm text-neutral-500 mt-1">{profile.bio}</p>
              )}
            </div>
            {!isOwnProfile && currentUserId && (
              <FollowButton targetUserId={userId} />
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-lg font-bold">{profile.total_stories || 0}</p>
              <p className="text-xs text-neutral-400">스토리</p>
            </div>
            <div>
              <p className="text-lg font-bold">{profile.total_followers || 0}</p>
              <p className="text-xs text-neutral-400">팔로워</p>
            </div>
            <div>
              <p className="text-lg font-bold">{profile.total_following || 0}</p>
              <p className="text-xs text-neutral-400">팔로잉</p>
            </div>
            <div>
              <p className="text-lg font-bold">
                {stories.reduce((sum, s) => sum + (s.total_likes || 0), 0)}
              </p>
              <p className="text-xs text-neutral-400">총 좋아요</p>
            </div>
          </div>
        </div>

        {/* Streak Card (own profile only) */}
        {isOwnProfile && streak && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 rounded-2xl border border-amber-200 dark:border-amber-800 p-5 mb-6 life-fade-in">
            <h3 className="font-bold text-sm flex items-center gap-2 mb-3">
              <Flame className="w-4 h-4 text-amber-500" />
              작성 스트릭
            </h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{streak.current_streak || 0}</p>
                <p className="text-xs text-neutral-500">연속 일수</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{streak.longest_streak || 0}</p>
                <p className="text-xs text-neutral-500">최장 기록</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">{streak.total_write_days || 0}</p>
                <p className="text-xs text-neutral-500">총 작성일</p>
              </div>
            </div>
          </div>
        )}

        {/* Badges */}
        {badges.length > 0 && (
          <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 p-5 mb-6 life-fade-in">
            <h3 className="font-bold text-sm flex items-center gap-2 mb-3">
              <Trophy className="w-4 h-4 text-rose-500" />
              획득한 뱃지
            </h3>
            <div className="grid grid-cols-4 gap-3">
              {badges.map((badge) => (
                <div
                  key={badge.id}
                  className="flex flex-col items-center gap-1.5 p-3 bg-neutral-50 dark:bg-neutral-700/50 rounded-xl badge-earned"
                  title={badge.meta?.description || ''}
                >
                  <span className="text-2xl">{badge.meta?.icon || '🏅'}</span>
                  <span className="text-[11px] font-medium text-center leading-tight">{badge.meta?.name || badge.badge_type}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-neutral-200 dark:border-neutral-700 mb-4">
          <button
            onClick={() => setActiveTab('stories')}
            className={`flex-1 py-2.5 text-sm font-medium text-center transition ${
              activeTab === 'stories'
                ? 'text-rose-500 border-b-2 border-rose-500'
                : 'text-neutral-400 hover:text-neutral-600'
            }`}
          >
            스토리
          </button>
          <button
            onClick={() => setActiveTab('liked')}
            className={`flex-1 py-2.5 text-sm font-medium text-center transition ${
              activeTab === 'liked'
                ? 'text-rose-500 border-b-2 border-rose-500'
                : 'text-neutral-400 hover:text-neutral-600'
            }`}
          >
            좋아요
          </button>
        </div>

        {/* Stories grid */}
        {activeTab === 'stories' && (
          stories.length === 0 ? (
            <div className="text-center py-12 text-neutral-400 text-sm">
              아직 공개된 스토리가 없습니다
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {stories.map((story) => (
                <div
                  key={story.id}
                  className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4 hover:shadow-md transition cursor-pointer life-fade-in"
                  onClick={() => router.push(`/life/story/${story.id}`)}
                >
                  <h3 className="font-semibold mb-1 truncate">{story.title}</h3>
                  <div className="flex items-center gap-2 text-xs text-neutral-400 mb-2">
                    {story.genre && (
                      <span className="px-1.5 py-0.5 bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded">
                        {story.genre}
                      </span>
                    )}
                    {story.recall_mode === 'recall' && (
                      <span className="px-1.5 py-0.5 bg-amber-50 dark:bg-amber-900/20 text-amber-500 rounded">
                        기억회상
                      </span>
                    )}
                    <span>{story.total_chapters || 0}챕터</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-neutral-400">
                    <span className="flex items-center gap-1">
                      <Heart className="w-3 h-3" />
                      {story.total_likes || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {story.total_views || 0}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {activeTab === 'liked' && (
          <div className="text-center py-12 text-neutral-400 text-sm">
            좋아요한 스토리 목록은 준비 중입니다
          </div>
        )}
      </main>
    </div>
  )
}
