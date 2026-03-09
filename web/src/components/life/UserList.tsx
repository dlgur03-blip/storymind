// @ts-nocheck
'use client'

import AuthorCard from '@/components/life/AuthorCard'
import { Loader2 } from 'lucide-react'

interface UserItem {
  userId: string
  displayName: string
  bio?: string
  avatarUrl?: string
  totalStories?: number
  totalFollowers?: number
}

interface UserListProps {
  users: UserItem[]
  loading?: boolean
  emptyMessage?: string
  currentUserId?: string | null
}

export default function UserList({ users, loading = false, emptyMessage = '사용자가 없습니다', currentUserId }: UserListProps) {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 text-stone-400 animate-spin" />
      </div>
    )
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-12 text-stone-400 dark:text-stone-500 text-sm font-serif">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {users.map((user) => (
        <AuthorCard
          key={user.userId}
          userId={user.userId}
          displayName={user.displayName}
          bio={user.bio}
          avatarUrl={user.avatarUrl}
          totalStories={user.totalStories}
          totalFollowers={user.totalFollowers}
          currentUserId={currentUserId}
        />
      ))}
    </div>
  )
}
