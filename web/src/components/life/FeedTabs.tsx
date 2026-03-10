// @ts-nocheck
'use client'

interface FeedTabsProps {
  active: string
  tabs: { key: string; label: string }[]
  onChange: (key: string) => void
}

export default function FeedTabs({ active, tabs, onChange }: FeedTabsProps) {
  return (
    <div className="flex gap-1">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-500 ${
            active === tab.key
              ? 'text-stone-800 dark:text-stone-200 bg-stone-100/80 dark:bg-stone-800/50'
              : 'text-stone-400 dark:text-stone-400 hover:text-stone-600 dark:hover:text-stone-400'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
