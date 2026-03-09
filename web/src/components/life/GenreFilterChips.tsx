// @ts-nocheck
'use client'

import { LIFE_GENRES } from '@/lib/life-constants'

interface GenreFilterChipsProps {
  selected: string
  onChange: (genre: string) => void
}

export default function GenreFilterChips({ selected, onChange }: GenreFilterChipsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      <button
        onClick={() => onChange('')}
        className={`shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-300 ${
          selected === ''
            ? 'bg-rose-700 text-white dark:bg-rose-600'
            : 'bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
        }`}
      >
        전체
      </button>
      {LIFE_GENRES.map((genre) => (
        <button
          key={genre}
          onClick={() => onChange(genre)}
          className={`shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-300 ${
            selected === genre
              ? 'bg-rose-700 text-white dark:bg-rose-600'
              : 'bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
          }`}
        >
          {genre}
        </button>
      ))}
    </div>
  )
}
