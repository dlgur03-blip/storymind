// @ts-nocheck
'use client'

import { useRouter } from 'next/navigation'
import { BookOpen, Heart, Pencil, Home } from 'lucide-react'

interface ServiceSwitcherProps {
  activeService: 'mind' | 'life' | 'editor'
}

export default function ServiceSwitcher({ activeService }: ServiceSwitcherProps) {
  const router = useRouter()

  return (
    <div className="flex items-center bg-stone-100/80 dark:bg-stone-800/60 rounded-full p-1">
      <button
        onClick={() => router.push('/home')}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-sm font-medium transition-all duration-300 text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300"
      >
        <Home className="w-3.5 h-3.5" />
      </button>
      <div className="w-px h-3.5 bg-stone-200/60 dark:bg-stone-700/40" />
      <button
        onClick={() => router.push('/dashboard')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-300 ${
          activeService === 'mind'
            ? 'bg-white dark:bg-stone-700 text-stone-800 dark:text-stone-200 shadow-sm'
            : 'text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300'
        }`}
      >
        <BookOpen className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Mind</span>
      </button>
      <button
        onClick={() => router.push('/life')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-300 ${
          activeService === 'life'
            ? 'bg-white dark:bg-stone-700 text-rose-700 dark:text-rose-400 shadow-sm'
            : 'text-stone-400 dark:text-stone-500 hover:text-rose-600 dark:hover:text-rose-400'
        }`}
      >
        <Heart className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Life</span>
      </button>
      <button
        onClick={() => router.push('/editor-mode')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-300 ${
          activeService === 'editor'
            ? 'bg-white dark:bg-stone-700 text-stone-800 dark:text-stone-200 shadow-sm'
            : 'text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300'
        }`}
      >
        <Pencil className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Editor</span>
      </button>
    </div>
  )
}
