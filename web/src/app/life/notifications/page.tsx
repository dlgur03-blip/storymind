// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase/client'
import { useStore } from '@/stores/store'
import LifeHeader from '@/components/life/LifeHeader'
import { Heart, MessageCircle, UserPlus, BookOpen, Bell, Check } from 'lucide-react'

export default function NotificationsPage() {
  const router = useRouter()
  const { lifeNotifications, fetchLifeNotifications, markNotificationsRead, setUser, darkMode, toggleDark } = useStore()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const supabase = getSupabase()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/')
        return
      }
      setUser({ id: session.user.id, email: session.user.email || '' })
      await fetchLifeNotifications()

      const savedDark = localStorage.getItem('sm_dark') === 'true'
      if (savedDark !== darkMode) toggleDark()

      setLoading(false)
    }
    init()
  }, [router])

  const handleMarkAllRead = async () => {
    await markNotificationsRead()
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'like': return <Heart className="w-4 h-4 text-rose-500" />
      case 'comment': return <MessageCircle className="w-4 h-4 text-blue-500" />
      case 'follow': return <UserPlus className="w-4 h-4 text-green-500" />
      case 'new_chapter': return <BookOpen className="w-4 h-4 text-purple-500" />
      default: return <Bell className="w-4 h-4 text-neutral-500" />
    }
  }

  const handleClick = (notif: any) => {
    if (notif.story_id) {
      if (notif.chapter_id) {
        router.push(`/life/story/${notif.story_id}`)
      } else {
        router.push(`/life/story/${notif.story_id}`)
      }
    } else if (notif.actor_id) {
      router.push(`/life/profile/${notif.actor_id}`)
    }
  }

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}분 전`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}시간 전`
    const days = Math.floor(hours / 24)
    return `${days}일 전`
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

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">알림</h1>
          {lifeNotifications.some((n) => !n.is_read) && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition"
            >
              <Check className="w-4 h-4" />
              모두 읽음
            </button>
          )}
        </div>

        {lifeNotifications.length === 0 ? (
          <div className="text-center py-20">
            <Bell className="w-12 h-12 text-neutral-300 dark:text-neutral-700 mx-auto mb-3" />
            <p className="text-neutral-400">알림이 없습니다</p>
          </div>
        ) : (
          <div className="space-y-2">
            {lifeNotifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleClick(notif)}
                className={`bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4 flex items-start gap-3 cursor-pointer hover:shadow-md transition life-fade-in ${
                  !notif.is_read ? 'border-l-4 border-l-rose-500' : ''
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center shrink-0">
                  {getIcon(notif.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-medium">{notif.actorName}</span>
                    {' '}
                    <span className="text-neutral-500">{notif.message}</span>
                  </p>
                  <span className="text-xs text-neutral-400">{timeAgo(notif.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
