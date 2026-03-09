// @ts-nocheck
'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase/client'
import { useStore } from '@/stores/store'
import LifeHeader from '@/components/life/LifeHeader'
import FeedTabs from '@/components/life/FeedTabs'
import UserList from '@/components/life/UserList'
import { ArrowLeft } from 'lucide-react'

export default function FollowersPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params)
  const router = useRouter()
  const { fetchFollowersList, darkMode, toggleDark } = useStore()

  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('followers')
  const [followers, setFollowers] = useState<any[]>([])
  const [following, setFollowing] = useState<any[]>([])
  const [profileName, setProfileName] = useState('')

  useEffect(() => {
    const init = async () => {
      const supabase = getSupabase()
      const { data: { session } } = await supabase.auth.getSession()
      if (session) setCurrentUserId(session.user.id)

      const savedDark = localStorage.getItem('sm_dark') === 'true'
      if (savedDark !== darkMode) toggleDark()

      // Fetch profile name
      const profileRes = await fetch(`/api/life/profile/${userId}`)
      const profileData = await profileRes.json()
      setProfileName(profileData.profile?.display_name || '')

      // Fetch both lists
      const [followersList, followingList] = await Promise.all([
        fetchFollowersList(userId, 'followers'),
        fetchFollowersList(userId, 'following'),
      ])
      setFollowers(followersList)
      setFollowing(followingList)
      setLoading(false)
    }
    init()
  }, [userId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="w-6 h-6 border-2 border-rose-700 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <LifeHeader />

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.push(`/life/profile/${userId}`)}
            className="p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-stone-500 dark:text-stone-400" />
          </button>
          <h1 className="font-serif text-xl font-medium text-stone-800 dark:text-stone-200">
            {profileName}
          </h1>
        </div>

        <FeedTabs
          active={activeTab}
          tabs={[
            { key: 'followers', label: `팔로워 ${followers.length}` },
            { key: 'following', label: `팔로잉 ${following.length}` },
          ]}
          onChange={setActiveTab}
        />

        <div className="mt-6">
          {activeTab === 'followers' ? (
            <UserList
              users={followers}
              emptyMessage="아직 팔로워가 없습니다"
              currentUserId={currentUserId}
            />
          ) : (
            <UserList
              users={following}
              emptyMessage="아직 팔로잉하는 사용자가 없습니다"
              currentUserId={currentUserId}
            />
          )}
        </div>
      </main>
    </div>
  )
}
