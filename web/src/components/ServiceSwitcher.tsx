// @ts-nocheck
'use client'

import { useRouter } from 'next/navigation'
import { BookOpen, Heart, Pencil } from 'lucide-react'

interface ServiceSwitcherProps {
  activeService: 'mind' | 'life' | 'editor'
}

export default function ServiceSwitcher({ activeService }: ServiceSwitcherProps) {
  const router = useRouter()

  return (
    <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 rounded-full p-1">
      <button
        onClick={() => router.push('/dashboard')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
          activeService === 'mind'
            ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm'
            : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
        }`}
      >
        <BookOpen className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">StoryMind</span>
      </button>
      <button
        onClick={() => router.push('/life')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
          activeService === 'life'
            ? 'bg-rose-500 text-white shadow-sm'
            : 'text-neutral-500 dark:text-neutral-400 hover:text-rose-500'
        }`}
      >
        <Heart className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">StoryLife</span>
      </button>
      <button
        onClick={() => router.push('/editor-mode')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
          activeService === 'editor'
            ? 'bg-blue-500 text-white shadow-sm'
            : 'text-neutral-500 dark:text-neutral-400 hover:text-blue-500'
        }`}
      >
        <Pencil className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Editor</span>
      </button>
    </div>
  )
}
