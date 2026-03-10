// @ts-nocheck
'use client'

import { LIFE_GENRES } from '@/lib/life-constants'

interface GenreFilterChipsProps {
  selected: string
  onChange: (genre: string) => void
}

export default function GenreFilterChips({ selected, onChange }: GenreFilterChipsProps) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide">
      <button
        onClick={() => onChange('')}
        className={`shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-500 ${
          selected === ''
            ? 'bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-900'
            : 'bg-stone-100/80 dark:bg-stone-800/50 text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300'
        }`}
      >
        전체
      </button>
      {LIFE_GENRES.map((genre) => (
        <button
          key={genre}
          onClick={() => onChange(genre)}
          className={`shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-500 ${
            selected === genre
              ? 'bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-900'
              : 'bg-stone-100/80 dark:bg-stone-800/50 text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300'
          }`}
        >
          {genre}
        </button>
      ))}
    </div>
  )
}
