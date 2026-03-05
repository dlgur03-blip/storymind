// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import { getSupabase } from '@/lib/supabase/client'
import { UserPlus, UserCheck, Loader2 } from 'lucide-react'

export default function FollowButton({ targetUserId }: { targetUserId: string }) {
  const [following, setFollowing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)

  useEffect(() => {
    const check = async () => {
      const supabase = getSupabase()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      const { data } = await supabase
        .from('life_follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', targetUserId)
        .maybeSingle()

      setFollowing(!!data)
      setLoading(false)
    }
    check()
  }, [targetUserId])

  const handleToggle = async () => {
    setToggling(true)
    setFollowing(!following)

    try {
      await fetch('/api/life/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_user_id: targetUserId }),
      })
    } catch {
      setFollowing(following) // revert
    }
    setToggling(false)
  }

  if (loading) return null

  return (
    <button
      onClick={handleToggle}
      disabled={toggling}
      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition ${
        following
          ? 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400'
          : 'bg-rose-500 text-white hover:bg-rose-600'
      }`}
    >
      {toggling ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : following ? (
        <UserCheck className="w-4 h-4" />
      ) : (
        <UserPlus className="w-4 h-4" />
      )}
      {following ? '팔로잉' : '팔로우'}
    </button>
  )
}
