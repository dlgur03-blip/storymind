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
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-neutral-800 rounded-2xl w-full max-w-sm p-6 text-center life-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-16 h-16 bg-rose-50 dark:bg-rose-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-8 h-8 text-rose-500" />
        </div>
        <h3 className="text-lg font-bold mb-2">{title}</h3>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-5">{description}</p>
        <button
          onClick={onClose}
          className="w-full py-3 bg-rose-500 text-white rounded-xl font-medium hover:bg-rose-600 transition"
        >
          확인
        </button>
      </div>
    </div>
  )
}
