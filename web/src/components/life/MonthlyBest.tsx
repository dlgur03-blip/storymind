// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { TrendingUp, Heart, Eye } from 'lucide-react'

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
      <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 p-4">
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-rose-500" />
          월간 인기 TOP
        </h3>
        <p className="text-xs text-neutral-400">이야기가 쌓이면 인기 목록이 표시됩니다</p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 p-4">
      <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-rose-500" />
        월간 인기 TOP
      </h3>
      <div className="space-y-2.5">
        {stories.map((s, i) => (
          <div
            key={s.id}
            className="flex items-center gap-2.5 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-700/50 rounded-lg p-1.5 -mx-1.5 transition"
            onClick={() => router.push(`/life/story/${s.id}`)}
          >
            <span className="w-5 h-5 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 flex items-center justify-center text-xs font-bold shrink-0">
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{s.title}</p>
              <p className="text-[11px] text-neutral-400">{s.authorName}</p>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-neutral-400 shrink-0">
              <span className="flex items-center gap-0.5"><Heart className="w-3 h-3" />{s.totalLikes}</span>
              <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" />{s.totalViews}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
