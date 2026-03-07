// @ts-nocheck
'use client'

import { X, Sparkles } from 'lucide-react'

interface ComingSoonPopupProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: string
}

export default function ComingSoonPopup({ isOpen, onClose, title = '준비 중입니다', description = '이 기능은 곧 출시될 예정이에요!' }: ComingSoonPopupProps) {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 modal-overlay"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-stone-900 rounded-2xl w-full max-w-sm p-8 text-center modal-content border border-stone-200/60 dark:border-stone-800/60"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-14 h-14 bg-stone-100 dark:bg-stone-800 rounded-full flex items-center justify-center mx-auto mb-5">
          <Sparkles className="w-6 h-6 text-stone-500 dark:text-stone-400" />
        </div>
        <h3 className="font-serif text-lg font-medium mb-2 text-stone-800 dark:text-stone-200">{title}</h3>
        <p className="text-sm text-stone-400 dark:text-stone-500 mb-6 leading-relaxed">{description}</p>
        <button
          onClick={onClose}
          className="w-full py-3 border border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-400 rounded-xl font-medium hover:bg-stone-50 dark:hover:bg-stone-800 transition-all duration-300"
        >
          확인
        </button>
      </div>
    </div>
  )
}
