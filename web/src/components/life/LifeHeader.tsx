// @ts-nocheck
'use client'

import { useRouter } from 'next/navigation'
import { Bell, User, BookOpen, Moon, Sun, HelpCircle, Compass } from 'lucide-react'
import ServiceSwitcher from '@/components/ServiceSwitcher'
import { useStore } from '@/stores/store'

export default function LifeHeader({ onShowGuide }: { onShowGuide?: () => void } = {}) {
  const router = useRouter()
  const { lifeUnreadCount, darkMode, toggleDark } = useStore()

  return (
    <header className="bg-white/80 dark:bg-stone-900/80 backdrop-blur-md border-b border-stone-200/60 dark:border-stone-800/60 sticky top-0 z-40">
      <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div
            className="flex items-center gap-1.5 cursor-pointer group"
            onClick={() => router.push('/life')}
          >
            <span className="font-serif text-xl tracking-tight">
              <span className="font-medium text-stone-800 dark:text-stone-200">Story</span>
              <span className="font-medium text-rose-700 dark:text-rose-400">Life</span>
            </span>
          </div>
          <ServiceSwitcher activeService="life" />
        </div>
        <nav className="flex items-center gap-0.5">
          <button
            onClick={() => router.push('/life/my')}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 hover:bg-stone-100/60 dark:hover:bg-stone-800/40 rounded-lg transition-all duration-300"
          >
            <BookOpen className="w-4 h-4" />
            <span className="hidden sm:inline">내 스토리</span>
          </button>
          <button
            onClick={() => router.push('/life/explore')}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 hover:bg-stone-100/60 dark:hover:bg-stone-800/40 rounded-lg transition-all duration-300"
          >
            <Compass className="w-4 h-4" />
            <span className="hidden sm:inline">탐색</span>
          </button>
          <button
            onClick={() => router.push('/life/notifications')}
            className="relative p-2 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 hover:bg-stone-100/60 dark:hover:bg-stone-800/40 rounded-lg transition-all duration-300"
          >
            <Bell className="w-[18px] h-[18px]" />
            {lifeUnreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-rose-700 text-white text-[10px] font-bold rounded-full flex items-center justify-center min-w-[18px] h-[18px] px-1">
                {lifeUnreadCount > 99 ? '99+' : lifeUnreadCount}
              </span>
            )}
          </button>
          {onShowGuide && (
            <button
              onClick={onShowGuide}
              className="p-2 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 hover:bg-stone-100/60 dark:hover:bg-stone-800/40 rounded-lg transition-all duration-300"
            >
              <HelpCircle className="w-[18px] h-[18px]" />
            </button>
          )}
          <button
            onClick={toggleDark}
            className="p-2 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 hover:bg-stone-100/60 dark:hover:bg-stone-800/40 rounded-lg transition-all duration-300"
          >
            {darkMode ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="p-2 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 hover:bg-stone-100/60 dark:hover:bg-stone-800/40 rounded-lg transition-all duration-300"
          >
            <User className="w-[18px] h-[18px]" />
          </button>
        </nav>
      </div>
    </header>
  )
}
