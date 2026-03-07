// @ts-nocheck
'use client'

import { useRef, useEffect } from 'react'
import { SkipForward } from 'lucide-react'

interface Chapter {
  id: string
  recall_age: number | null
  recall_year: number | null
  is_skipped: boolean
  is_published: boolean
  content: string | null
}

interface RecallTimelineProps {
  currentAge: number
  birthYear: number
  chapters: Chapter[]
  selectedAge: number
  onSelectAge: (age: number) => void
}

const AGE_GROUPS = [
  { label: '유아기', range: [0, 6], color: 'rose' },
  { label: '아동기', range: [7, 12], color: 'amber' },
  { label: '청소년기', range: [13, 18], color: 'blue' },
  { label: '성인기', range: [19, 100], color: 'emerald' },
]

function getGroupForAge(age: number) {
  return AGE_GROUPS.find(g => age >= g.range[0] && age <= g.range[1]) || AGE_GROUPS[3]
}

export default function RecallTimeline({ currentAge, birthYear, chapters, selectedAge, onSelectAge }: RecallTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const selectedRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (selectedRef.current && scrollRef.current) {
      const container = scrollRef.current
      const el = selectedRef.current
      const offset = el.offsetLeft - container.clientWidth / 2 + el.clientWidth / 2
      container.scrollTo({ left: offset, behavior: 'smooth' })
    }
  }, [selectedAge])

  const chapterMap = new Map<number, Chapter>()
  chapters.forEach(ch => {
    if (ch.recall_age !== null && ch.recall_age !== undefined) {
      chapterMap.set(ch.recall_age, ch)
    }
  })

  const ages = Array.from({ length: Math.min(currentAge + 1, 100) }, (_, i) => i)

  const getStatus = (age: number) => {
    const ch = chapterMap.get(age)
    if (!ch) return 'empty'
    if (ch.is_skipped) return 'skipped'
    if (ch.is_published) return 'completed'
    if (ch.content) return 'in_progress'
    return 'started'
  }

  const statusStyles: Record<string, string> = {
    completed: 'bg-emerald-600 text-white border-emerald-600',
    in_progress: 'bg-amber-500 text-white border-amber-500',
    started: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-300/60 dark:border-amber-700/40',
    skipped: 'bg-stone-200 dark:bg-stone-700 text-stone-400 line-through border-stone-300/60 dark:border-stone-600/40',
    empty: 'bg-stone-50 dark:bg-stone-800/60 text-stone-400 dark:text-stone-500 border-stone-200/60 dark:border-stone-700/40',
  }

  let lastGroup = ''

  return (
    <div className="bg-white/80 dark:bg-stone-900/60 backdrop-blur-sm border-b border-stone-200/60 dark:border-stone-800/40 px-4 py-4">
      <div className="max-w-6xl mx-auto">
        <div
          ref={scrollRef}
          className="flex items-end gap-1.5 overflow-x-auto pb-2 timeline-slide-in"
          style={{ scrollbarWidth: 'thin' }}
        >
          {ages.map((age) => {
            const group = getGroupForAge(age)
            const showLabel = group.label !== lastGroup
            lastGroup = group.label
            const status = getStatus(age)
            const isSelected = age === selectedAge

            return (
              <div key={age} className="flex flex-col items-center shrink-0">
                {showLabel && (
                  <span className="text-[10px] text-stone-400 dark:text-stone-500 mb-1.5 whitespace-nowrap font-medium">{group.label}</span>
                )}
                {!showLabel && <span className="text-[10px] mb-1.5 invisible">.</span>}
                <button
                  ref={isSelected ? selectedRef : undefined}
                  onClick={() => onSelectAge(age)}
                  className={`w-9 h-9 rounded-full border text-xs font-medium transition-all duration-300 flex items-center justify-center ${statusStyles[status]} ${
                    isSelected ? 'ring-2 ring-rose-700 dark:ring-rose-500 ring-offset-2 dark:ring-offset-stone-900 scale-110' : 'hover:scale-105'
                  }`}
                  title={`${age}세 (${birthYear + age}년)`}
                >
                  {status === 'skipped' ? <SkipForward className="w-3.5 h-3.5" /> : age}
                </button>
              </div>
            )
          })}
        </div>
        <div className="flex items-center gap-5 mt-3 text-[10px] text-stone-400 dark:text-stone-500">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-600" /> 완료</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /> 진행중</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-stone-300 dark:bg-stone-600" /> 건너뜀</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700" /> 미작성</span>
        </div>
      </div>
    </div>
  )
}
