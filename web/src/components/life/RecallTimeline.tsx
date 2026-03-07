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
    completed: 'bg-green-500 text-white border-green-500',
    in_progress: 'bg-amber-400 text-white border-amber-400',
    started: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700',
    skipped: 'bg-neutral-200 dark:bg-neutral-700 text-neutral-400 line-through border-neutral-300 dark:border-neutral-600',
    empty: 'bg-neutral-50 dark:bg-neutral-800 text-neutral-400 border-neutral-200 dark:border-neutral-700',
  }

  let lastGroup = ''

  return (
    <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-4 py-3">
      <div className="max-w-6xl mx-auto">
        <div
          ref={scrollRef}
          className="flex items-end gap-1.5 overflow-x-auto pb-2 scrollbar-thin timeline-slide-in"
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
                  <span className="text-[10px] text-neutral-400 mb-1 whitespace-nowrap">{group.label}</span>
                )}
                {!showLabel && <span className="text-[10px] mb-1 invisible">.</span>}
                <button
                  ref={isSelected ? selectedRef : undefined}
                  onClick={() => onSelectAge(age)}
                  className={`w-9 h-9 rounded-full border-2 text-xs font-medium transition-all flex items-center justify-center ${statusStyles[status]} ${
                    isSelected ? 'ring-2 ring-rose-500 ring-offset-2 dark:ring-offset-neutral-900 scale-110' : 'hover:scale-105'
                  }`}
                  title={`${age}세 (${birthYear + age}년)`}
                >
                  {status === 'skipped' ? <SkipForward className="w-3.5 h-3.5" /> : age}
                </button>
              </div>
            )
          })}
        </div>
        <div className="flex items-center gap-4 mt-2 text-[10px] text-neutral-400">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500" /> 완료</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> 진행중</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-neutral-300 dark:bg-neutral-600" /> 건너뜀</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700" /> 미작성</span>
        </div>
      </div>
    </div>
  )
}
