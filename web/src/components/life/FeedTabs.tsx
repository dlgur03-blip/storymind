// @ts-nocheck
'use client'

interface FeedTabsProps {
  active: string
  tabs: { key: string; label: string }[]
  onChange: (key: string) => void
}

export default function FeedTabs({ active, tabs, onChange }: FeedTabsProps) {
  return (
    <div className="flex border-b border-stone-200/60 dark:border-stone-800/40">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`flex-1 py-3 text-sm font-medium text-center transition-all duration-300 ${
            active === tab.key
              ? 'text-rose-700 dark:text-rose-400 border-b-2 border-rose-700 dark:border-rose-400'
              : 'text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-400'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
