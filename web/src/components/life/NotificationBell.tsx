// @ts-nocheck
'use client'

import { Bell } from 'lucide-react'
import { useStore } from '@/stores/store'
import { useRouter } from 'next/navigation'

export default function NotificationBell() {
  const router = useRouter()
  const { lifeUnreadCount } = useStore()

  return (
    <button
      onClick={() => router.push('/life/notifications')}
      className="relative p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition"
    >
      <Bell className="w-5 h-5 text-neutral-600 dark:text-neutral-300" />
      {lifeUnreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
          {lifeUnreadCount > 99 ? '99+' : lifeUnreadCount}
        </span>
      )}
    </button>
  )
}
