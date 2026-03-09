// @ts-nocheck
'use client'

import { useRouter } from 'next/navigation'
import FollowButton from '@/components/life/FollowButton'
import { BookOpen, Users } from 'lucide-react'

interface AuthorCardProps {
  userId: string
  displayName: string
  bio?: string
  avatarUrl?: string
  totalStories?: number
  totalFollowers?: number
  showFollow?: boolean
  currentUserId?: string | null
}

export default function AuthorCard({
  userId,
  displayName,
  bio,
  avatarUrl,
  totalStories = 0,
  totalFollowers = 0,
  showFollow = true,
  currentUserId,
}: AuthorCardProps) {
  const router = useRouter()

  return (
    <div
      className="bg-white/60 dark:bg-stone-900/40 rounded-xl border border-stone-200/60 dark:border-stone-800/40 p-4 card-hover cursor-pointer"
      onClick={() => router.push(`/life/profile/${userId}`)}
    >
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-sm font-medium text-stone-600 dark:text-stone-400 shrink-0 ring-1 ring-stone-200/60 dark:ring-stone-700/60">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-11 h-11 rounded-full object-cover" />
          ) : (
            displayName?.charAt(0) || '?'
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-stone-700 dark:text-stone-300 truncate">{displayName}</p>
          {bio && (
            <p className="text-xs text-stone-400 dark:text-stone-500 truncate mt-0.5">{bio}</p>
          )}
          <div className="flex items-center gap-3 mt-1 text-xs text-stone-400 dark:text-stone-500">
            <span className="flex items-center gap-1">
              <BookOpen className="w-3 h-3" />
              {totalStories}
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {totalFollowers}
            </span>
          </div>
        </div>
        {showFollow && currentUserId && currentUserId !== userId && (
          <div onClick={(e) => e.stopPropagation()}>
            <FollowButton targetUserId={userId} />
          </div>
        )}
      </div>
    </div>
  )
}
