// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Heart, Eye } from 'lucide-react'

interface TopStory {
  id: string
  title: string
  authorName: string
  totalLikes: number
  totalViews: number
}

export default function MonthlyBest() {
  const router = useRouter()
  const [stories, setStories] = useState<TopStory[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTop = async () => {
      try {
        const res = await fetch('/api/life/feed?page=1&limit=5')
        const data = await res.json()
        const top = (data.feed || [])
          .sort((a: any, b: any) => (b.totalLikes + b.totalViews) - (a.totalLikes + a.totalViews))
          .slice(0, 5)
          .map((s: any) => ({
            id: s.id,
            title: s.title,
            authorName: s.authorName,
            totalLikes: s.totalLikes,
            totalViews: s.totalViews,
          }))
        setStories(top)
      } catch {}
      setLoading(false)
    }
    fetchTop()
  }, [])

  if (loading || stories.length === 0) {
    return (
      <div className="bg-white/50 dark:bg-stone-800/40 rounded-2xl border border-stone-200/40 dark:border-stone-700/40 p-6">
        <h3 className="font-serif font-medium text-sm mb-3 text-stone-600 dark:text-stone-400 tracking-wide">
          월간 인기
        </h3>
        <p className="text-xs text-stone-400 dark:text-stone-400 leading-relaxed">이야기가 쌓이면 인기 목록이 표시됩니다</p>
      </div>
    )
  }

  return (
    <div className="bg-white/50 dark:bg-stone-800/40 rounded-2xl border border-stone-200/40 dark:border-stone-700/40 p-6">
      <h3 className="font-serif font-medium text-sm mb-5 text-stone-600 dark:text-stone-400 tracking-wide">
        월간 인기
      </h3>
      <div className="space-y-1">
        {stories.map((s, i) => (
          <div
            key={s.id}
            className="flex items-center gap-3.5 cursor-pointer hover:bg-stone-50/60 dark:hover:bg-stone-800/20 rounded-xl p-2.5 -mx-2.5 transition-all duration-500"
            onClick={() => router.push(`/life/story/${s.id}`)}
          >
            <span className="w-6 text-center font-serif text-sm font-medium text-stone-300 dark:text-stone-400 shrink-0">
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-stone-700 dark:text-stone-300">{s.title}</p>
              <p className="text-[11px] text-stone-400 dark:text-stone-400 mt-0.5">{s.authorName}</p>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-stone-400 dark:text-stone-400 shrink-0">
              <span className="flex items-center gap-0.5"><Heart className="w-3 h-3" />{s.totalLikes}</span>
              <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" />{s.totalViews}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
