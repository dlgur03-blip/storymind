// @ts-nocheck
'use client'

import { useState } from 'react'
import { BookOpen, MessageCircle, Sparkles, Send, Users, ChevronRight, ChevronLeft, X } from 'lucide-react'

const STEPS = [
  {
    icon: BookOpen,
    title: '나만의 이야기를 나만의 소설로',
    subtitle: 'StoryLife에 오신 것을 환영합니다',
    description: '일상의 이야기를 AI와 함께 소설로 만들어보세요.\n당신의 하루가 특별한 이야기가 됩니다.',
  },
  {
    icon: Sparkles,
    title: '스토리 만들기',
    subtitle: '내 스토리 페이지에서 시작하세요',
    description: '제목과 장르를 입력하고 새 스토리를 생성하세요.\n일상, 로맨스, 성장 등 다양한 장르를 선택할 수 있습니다.',
  },
  {
    icon: MessageCircle,
    title: 'AI와 대화하기',
    subtitle: '친구처럼 이야기를 나눠보세요',
    description: 'AI 친구에게 오늘 있었던 일을 이야기해주세요.\nAI가 디테일을 물어보며 3~5회 대화를 나눕니다.',
  },
  {
    icon: Send,
    title: '챕터 생성 & 발행',
    subtitle: '대화가 소설이 되는 마법',
    description: '"챕터 생성" 버튼을 누르면 대화 내용이 소설로 변환됩니다.\n내용을 편집한 뒤 "발행" 버튼을 눌러 공개하세요.',
  },
  {
    icon: Users,
    title: '커뮤니티',
    subtitle: '다른 작가들과 교류하세요',
    description: '다른 사람의 스토리에 읽기 요청을 보내보세요.\n작가가 수락하면 스토리를 읽고 좋아요, 댓글, 팔로우를 할 수 있습니다.',
  },
]

export default function LifeOnboarding({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0)
  const current = STEPS[step]
  const Icon = current.icon
  const isLast = step === STEPS.length - 1

  const handleClose = () => {
    localStorage.setItem('sl_onboarding_done', 'true')
    onClose()
  }

  const handleNext = () => {
    if (isLast) {
      handleClose()
    } else {
      setStep(step + 1)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 modal-overlay">
      <div className="bg-white dark:bg-stone-900 rounded-2xl w-full max-w-md overflow-hidden life-fade-in modal-content border border-stone-200/60 dark:border-stone-800/60">
        {/* Header with close */}
        <div className="flex items-center justify-between px-6 pt-5">
          <div className="flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step
                    ? 'w-6 bg-rose-700'
                    : i < step
                    ? 'w-1.5 bg-rose-300'
                    : 'w-1.5 bg-stone-200 dark:bg-stone-600'
                }`}
              />
            ))}
          </div>
          <button
            onClick={handleClose}
            className="p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-8 text-center">
          <div className="w-16 h-16 bg-rose-50 dark:bg-rose-900/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Icon className="w-8 h-8 text-rose-700 dark:text-rose-400" />
          </div>
          <h2 className="text-xl font-serif font-medium text-stone-800 dark:text-stone-200 mb-1">{current.title}</h2>
          <p className="text-sm text-rose-700 dark:text-rose-400 font-medium mb-4">{current.subtitle}</p>
          <p className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed whitespace-pre-line">
            {current.description}
          </p>
        </div>

        {/* Navigation */}
        <div className="px-6 pb-6 flex items-center gap-3">
          {step > 0 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="flex items-center gap-1 px-4 py-2.5 border border-stone-200 dark:border-stone-700 rounded-xl text-sm font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 transition"
            >
              <ChevronLeft className="w-4 h-4" />
              이전
            </button>
          ) : (
            <button
              onClick={handleClose}
              className="px-4 py-2.5 text-sm text-stone-400 hover:text-stone-600 transition"
            >
              건너뛰기
            </button>
          )}
          <button
            onClick={handleNext}
            className="flex-1 py-2.5 border border-rose-700 text-rose-700 dark:text-rose-400 dark:border-rose-600 rounded-xl font-medium hover:bg-rose-700 hover:text-white dark:hover:bg-rose-700 dark:hover:text-white transition-all duration-300 flex items-center justify-center gap-1"
          >
            {isLast ? '시작하기' : '다음'}
            {!isLast && <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  )
}
