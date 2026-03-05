// @ts-nocheck
'use client'

import { useRouter } from 'next/navigation'
import { Heart, Bell, User, BookOpen, Moon, Sun } from 'lucide-react'
import ServiceSwitcher from '@/components/ServiceSwitcher'
import { useStore } from '@/stores/store'

export default function LifeHeader() {
  const router = useRouter()
  const { lifeUnreadCount, darkMode, toggleDark } = useStore()

  return (
    <header className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 sticky top-0 z-40">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/life')}>
            <Heart className="w-6 h-6 text-rose-500" />
            <span className="font-bold text-lg">
              Story<span className="text-rose-500">Life</span>
            </span>
          </div>
          <ServiceSwitcher activeService="life" />
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => router.push('/life/my')}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition"
          >
            <BookOpen className="w-4 h-4" />
            <span className="hidden sm:inline">내 스토리</span>
          </button>
          <button
            onClick={() => router.push('/life/notifications')}
            className="relative p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition"
          >
            <Bell className="w-5 h-5 text-neutral-600 dark:text-neutral-300" />
            {lifeUnreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center min-w-[18px] h-[18px]">
                {lifeUnreadCount > 99 ? '99+' : lifeUnreadCount}
              </span>
            )}
          </button>
          <button
            onClick={toggleDark}
            className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition"
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition"
          >
            <User className="w-5 h-5 text-neutral-600 dark:text-neutral-300" />
          </button>
        </div>
      </div>
    </header>
  )
}
